// Copyright (c) 2018 Zilliqa 
// This source code is being disclosed to you solely for the purpose of your participation in 
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to 
// the protocols and algorithms that are programmed into, and intended by, the code. You may 
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd., 
// including modifying or publishing the code (or any part of it), and developing or forming 
// another public or private blockchain network. This source code is provided ‘as is’ and no 
// warranties are given as to title or non-infringement, merchantability or fitness for purpose 
// and, to the extent permitted by law, all liability for your use of the code is disclaimed. 


import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { catchError, map, tap } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import 'setimmediate';
import $ from 'jquery';
import { Wallet } from './wallet/wallet';
import { zLib } from 'z-lib';
import { secp256k1, randomBytes, pbkdf2Sync, scrypt } from 'bcrypto';
import * as aesjs from 'aes-js';
import sha3 from 'bcrypto/lib/sha3';
import * as Signature from 'elliptic/lib/elliptic/ec/signature';
import uuidv4 from 'uuid/v4';

declare const Buffer

@Injectable()
export class ZilliqaService {

  zlib: any;
  node: any;
  walletData: {
    version: null,
    encryptedWalletFile: null,
    decryptedWalletFile: null
  };
  nodeData: {};
  userWallet: Wallet

  constructor(private http: HttpClient) {
    this.userWallet = new Wallet()
    this.walletData = {
      version: null,
      encryptedWalletFile: null,
      decryptedWalletFile: null
    };
    this.nodeData = {
      networkId: null,
      latestDsBlock: null
    };
    this.initLib();
  }

  initLib() {
    this.zlib = new zLib({
      nodeUrl: 'http://localhost:4201'
    });
    this.node = this.zlib.getNode();
  }

  getInitData() {
    var deferred = new $.Deferred();
    var that = this;

    that.node.getNetworkId(function(err, data1) {
      if (err) deferred.reject(err);

      that.node.getLatestDsBlock(function(err, data2) {
        if (err || !data2.result) deferred.reject(err);

        deferred.resolve({
          networkId: data1.result,
          latestDSBlock: data2.result.blockNum
        });
      });
    });

    return deferred.promise();
  }

  getWallet() {
    return this.userWallet
  }

  uploadWalletFile(contents) {
    this.walletData.encryptedWalletFile = contents
  }

  generateWalletJson(passphrase) {
    let privateKey = new Buffer(this.userWallet.privateKey, 'hex')
    let address = this.userWallet.address

    let salt = randomBytes(32);
    let iv = randomBytes(16);

    // key derivation function used is scrypt along with standard params
    let derivedKey = scrypt.derive(new Buffer(passphrase), salt, 262144, 1, 8, 32)
    // ciphertext is private key encrypted with aes-128-ctr
    let aesctr = new aesjs.ModeOfOperation.ctr(derivedKey.slice(0, 16), new aesjs.Counter(iv))
    let ciphertext = aesctr.encrypt(privateKey)

    var result = {
        address: address,
        crypto: {
            cipher: "aes-128-ctr",
            cipherparams: {
                iv: iv.toString('hex'),
            },
            ciphertext: new Buffer(ciphertext).toString('hex'),
            kdf: "scrypt",
            kdfparams: {
                dklen: 32,
                n: 262144,
                r: 1,
                p: 8,
                salt: salt.toString('hex'),
            },
            mac: sha3.digest(Buffer.concat([derivedKey.slice(16, 32), new Buffer(ciphertext)])).toString('hex'),
        },
        id: uuidv4({random: randomBytes(16)}),
        version: 3,
    }

    return JSON.stringify(result)
  }

  checkEncryptedWallet() {
    // todo - verify that the encrypted wallet uploaded by user has a valid structure
    if (this.walletData.encryptedWalletFile == null) 
      return false

    return true
  }

  decryptWalletFile(passphrase) {
    // use the passphrase and keystore json file to get private key
    if (passphrase && passphrase.length >= 8) {
      let walletJson = JSON.parse(this.walletData.encryptedWalletFile)

      let ciphertext = new Buffer(walletJson['crypto']['ciphertext'], 'hex')
      let iv = new Buffer(walletJson['crypto']['cipherparams']['iv'], 'hex')
      let salt = new Buffer(walletJson['crypto']['kdfparams']['salt'], 'hex')
      let kdfparams = walletJson['crypto']['kdfparams']
      
      // recreate the derived key using scrypt and the same parameters
      let derivedKey = scrypt.derive(new Buffer(passphrase), salt, kdfparams['n'], kdfparams['r'], kdfparams['p'], kdfparams['dklen'])

      // check passphrase using mac
      let mac = sha3.digest(Buffer.concat([derivedKey.slice(16, 32), ciphertext])).toString('hex')      
      if (mac.toLowerCase() !== walletJson['crypto']['mac'].toLowerCase()) {
        // Incorrect passphrase
        return this.falseDeferred()
      }

      let aesctr = new aesjs.ModeOfOperation.ctr(derivedKey.slice(0, 16), new aesjs.Counter(iv))
      let decryptedSeed = aesctr.decrypt(ciphertext);

      return this.importWallet(new Buffer(decryptedSeed).toString('hex'))
    } else {
      // needs to return deferred obj to match return type of if-true condition
      return this.falseDeferred()
    }
  }

  falseDeferred() {
    var deferred = new $.Deferred()
    deferred.resolve({result: false})
    return deferred.promise()
  }

  getBalance(address) {
    var deferred = new $.Deferred()

    this.node.getBalance({address: address}, function(err, data) {
      if (err) deferred.reject(err)

      deferred.resolve({
        address: address,
        balance: data.result.balance,
        nonce: data.result.nonce
      })
    })

    return deferred.promise()
  }

  getAddressFromPrivateKey(privateKey) {
    if (typeof(privateKey) == 'string') privateKey = new Buffer(privateKey, 'hex')

    let pubKey = secp256k1.publicKeyCreate(privateKey, true)
    let pubKeyHash = sha3.digest(pubKey) // sha3 hash of the public key
    let address = pubKeyHash.toString('hex', 12) // rightmost 160 bits/20 bytes of the hash

    return address
  }

  createWallet() {
    let key = secp256k1.generatePrivateKey()

    // account will be registered only when it receives ZIL
    this.userWallet = {
      address: this.getAddressFromPrivateKey(key),
      privateKey: key.toString('hex'),
      balance: 0,
      nonce: 0
    }

    // don't store private key
    return {privateKey: key.toString('hex')}
  }

  importWallet(privateKey) {
    if (typeof(privateKey) == 'string') privateKey = new Buffer(privateKey, 'hex')

    var deferred = new $.Deferred()

    // check if private key valid
    try {
      if (secp256k1.privateKeyVerify(privateKey)) {
        let addr = this.getAddressFromPrivateKey(privateKey)

        // get balance from API
        let that = this
        this.node.getBalance({address: addr}, function(err, data) {
          if (err || data.error) deferred.resolve({result: false})

          that.userWallet = {
            address: addr,
            balance: data.result.balance,
            nonce: data.result.nonce,
            privateKey: privateKey.toString('hex')
          }

          deferred.resolve({
            result: true
          })
        })
      } else {
        deferred.resolve({
          result: false
        })
      }
    } catch (e) {
      deferred.resolve({
        result: false
      })
    }
    return deferred.promise()
  }

  resetWallet() {
    this.userWallet = new Wallet()
  }

  intToByteArray(x, sizeOfInt)
  {
    var bytes = []

    let binaryX = x.toString(16)
    let binaryRepX = []

    var i
    for(i = 0 ; i < binaryX.length ; i++) {
      binaryRepX[i] = parseInt(binaryX[i])
    }

    for(i = 0 ; i < (sizeOfInt-binaryX.length) ; i++){
      bytes.push(0)
    }

    for(i = 0 ; i < binaryX.length ; i++) {
      bytes.push(binaryRepX[i])
    }

    return bytes;
  }

  sendPayment(payment) {
    // checkValid(payment.address)
    var deferred = new $.Deferred()
    let pubKey = secp256k1.publicKeyCreate(new Buffer(this.userWallet.privateKey, 'hex'), true)

    let txn = {
      version: 0,
      nonce: this.userWallet.nonce++,
      to: payment.address,
      amount: payment.amount,
      pubKey: pubKey.toString('hex'),
      gasPrice: payment.gasPrice,
      gasLimit: payment.gasLimit
    }

    var msg = this.intToByteArray(txn.version, 8).join('') +
              this.intToByteArray(txn.nonce, 64).join('') +
              txn.to +
              txn.pubKey +
              this.intToByteArray(txn.amount, 64).join('')

    let r = '', s = ''
    while (r.length != 64 && s.length != 64) {
      // sometimes 63 length string is generated
      let sig = this.zlib.schnorr.sign(new Buffer(msg, 'hex'), new Buffer(this.userWallet.privateKey, 'hex'), pubKey)
      r = sig.r.toString('hex')
      s = sig.s.toString('hex')
    }
    txn['signature'] = r + s

    this.node.createTransaction(txn, function(err, data) {
      if (err || data.error) deferred.reject(err)

      deferred.resolve({
        txId: data.result
      })
    })

    return deferred.promise()
  }

  getTxHistory() {
    var deferred = new $.Deferred()

    // this.node.getTransactionHistory({address: this.userWallet.address}, function(err, data) {
    //   if (err) deferred.reject(err)

      // deferred.resolve(data.result)
      deferred.resolve(
        [{
          id: '0x123',
          to: '0x456',
          from: '0x789',
          amount: 59
        },
        {
          id: '0xeee',
          to: '0xfff',
          from: '0xddd',
          amount: 100
        },
        {
          id: '0x111212312312312123132fgrebgr34',
          to: '0x111212312312312123132234245433',
          from: '0x2768r73gireh32r8y734g9ure3y28rih',
          amount: 18
        },
        {
          id: '0x2ihu3gr398gi3g234g90243gijubeh39fio',
          to: '0x2j49f84jg983jg9384jg938gh398g398hg394gh3948g3',
          from: '0x892j4g398jg34g2398j432f983o9gj398gj3gh4g8',
          amount: 32
        }]
      )
    // })

    return deferred.promise()
  }

  /**
   * Handle Http operation that failed - let the app continue
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T> (operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {

      console.error(error); // log to console

      // TODO: better job of transforming error for user consumption
      // this.log(`${operation} failed: ${error.message}`);

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }
}
