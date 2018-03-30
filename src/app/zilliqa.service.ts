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
import * as $ from 'jquery';
import { Wallet } from './wallet/wallet';
import { Constants } from './constants';
import { zLib } from 'z-lib';
import { secp256k1, randomBytes, pbkdf2Sync, scrypt, sha3, sha256 } from 'bcrypto';
import * as aesjs from 'aes-js';
import * as Signature from 'elliptic/lib/elliptic/ec/signature';
import * as uuid from 'uuid';

declare const Buffer

@Injectable()
export class ZilliqaService {

  zlib: any;
  node: any;
  walletData: {
    version: null,
    encryptedWalletFile: null
  };
  nodeData: {};
  userWallet: Wallet

  constructor(private http: HttpClient) {
    this.userWallet = new Wallet()
    this.walletData = {
      version: null,
      encryptedWalletFile: null
    };
    this.nodeData = {
      networkId: null,
      latestDsBlock: null
    };
    this.initLib();
  }

  /**
   * connect to a node using the zilliqa js lib and store its reference
   */
  initLib() {
    let node_urls = Constants.NODE_URLS
    let randomNode = node_urls[Math.floor(Math.random() * node_urls.length)]

    this.zlib = new zLib({
      nodeUrl: randomNode
    })
    this.node = this.zlib.getNode()
  }

  /**
   * fetch miscellaneous data like networkId/latest Tx blocknum
   * @returns {Promise} Promise object containing the required data
   */
  getInitData(): Promise<any> {
    var deferred = new $.Deferred();
    var that = this;

    that.node.getNetworkId(function(err, data1) {
      if (err || !data1.result) {
        deferred.reject(err)
      } else {
        that.node.getLatestTxBlock(function(err, data2) {
          if (err || !data2.result) {
            deferred.reject(err)
          } else {
            deferred.resolve({
              networkId: data1.result,
              latestTxBlock: data2.result.header.BlockNum
            })
          }
        })
      }
    })

    return deferred.promise();
  }

  /**
   * fetch the current user account details
   * @returns {Wallet} Wallet object containing the required data
   */
  getWallet(): Wallet {
    return this.userWallet
  }

  /**
   * store the file data uploaded by user
   * @param {string} contents - the file data uploaded
   */
  uploadWalletFile(contents): void {
    this.walletData.encryptedWalletFile = contents
  }

  /**
   * create a keystore json (wallet file) for an account containing the encrypted private key
   * @param {string} passphrase - the passphrase to be used to encrypt the wallet
   * @returns {string} string of the keystore json
   */
  generateWalletJson(passphrase): string {
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
        id: uuid.v4({random: randomBytes(16)}),
        version: 3,
    }

    return JSON.stringify(result)
  }

  /**
   * verify that the encrypted wallet uploaded by user has a valid structure
   * uses this.walletData
   * @returns {boolean} if valid keystore json or not
   */
  checkEncryptedWallet(): boolean {
    // todo - add more checks
    if (this.walletData.encryptedWalletFile == null) 
      return false
    
    try {
      let parsed = JSON.parse(this.walletData.encryptedWalletFile)
    } catch (e) {
      return false
    }

    return true
  }

  /**
   * process a keystore json file to retrieve the private key and import the account data
   * uses this.walletData to import data and this.userWallet to store data separately
   * @param {string} passphrase - the passphrase of the keystore json entered by the user
   * @returns {Promise} Promise object containing boolean - if imported successfully or not
   */
  decryptWalletFile(passphrase): Promise<any> {
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
        // needs to return deferred obj to match return type of function
        var deferred = new $.Deferred()
        deferred.resolve({result: false})
        return deferred.promise()
      }

      let aesctr = new aesjs.ModeOfOperation.ctr(derivedKey.slice(0, 16), new aesjs.Counter(iv))
      let decryptedSeed = aesctr.decrypt(ciphertext);

      return this.importWallet(new Buffer(decryptedSeed).toString('hex'))
    } else {
      // needs to return deferred obj to match return type of function
      var deferred = new $.Deferred()
      deferred.resolve({result: false})
      return deferred.promise()
    }
  }

  /**
   * get the account details of an account using its public address
   * @param {string} address - the public address of the account
   * @returns {Promise} Promise object containing address, balance and nonce of the account
   */
  refreshBalance(): Promise<any> {
    var deferred = new $.Deferred()

    let that = this
    this.node.getBalance({address: this.userWallet.address}, function(err, data) {
      if (err || data.error) {
        deferred.reject({error: err})
      } else {
        let newUserWallet = {
          address: that.userWallet.address,
          balance: data.result.balance,
          nonce: data.result.nonce,
          privateKey: that.userWallet.privateKey
        }
        that.userWallet = newUserWallet

        deferred.resolve({
          result: true
        })
      }
    })

    return deferred.promise()
  }

  /**
   * get the public address of an account using its private key
   * @param {string} privateKey - the private key of the account
   * @returns {string} public address of the account
   */
  getAddressFromPrivateKey(privateKey): string {
    if (typeof(privateKey) == 'string') privateKey = new Buffer(privateKey, 'hex')

    let pubKey = secp256k1.publicKeyCreate(privateKey, true)
    let pubKeyHash = sha256.digest(pubKey) // sha256 hash of the public key
    let address = pubKeyHash.toString('hex', 12) // rightmost 160 bits/20 bytes of the hash

    return address
  }

  /**
   * generate a new public-private keypair and use it to populate userWallet
   * @returns {string} the newly created private key
   */
  createWallet(): string {
    let key = secp256k1.generatePrivateKey()

    // account will be registered only when it receives ZIL
    this.userWallet = {
      address: this.getAddressFromPrivateKey(key),
      privateKey: key.toString('hex'),
      balance: 0,
      nonce: 0
    }

    return key.toString('hex')
  }

  /**
   * import an account wallet from server using a private key
   * @param {string} privateKey - the private key of the account being imported
   * @returns {Promise} Promise object containing boolean - if imported successfully or not
   */
  importWallet(privateKey): Promise<any> {
    var deferred = new $.Deferred()

    if (!!(privateKey.match(/[0-9a-fA-F]{64}/)) == false) {
      deferred.reject({
        error: 'Invalid private key.'
      })
      return deferred.promise()
    }

    if (typeof(privateKey) == 'string') privateKey = new Buffer(privateKey, 'hex')

    // check if private key valid
    try {
      if (secp256k1.privateKeyVerify(privateKey)) {
        let addr = this.getAddressFromPrivateKey(privateKey)

        // get balance from API
        let that = this
        this.node.getBalance({address: addr}, function(err, data) {
          if (err || data.error) {
            deferred.reject({error: err})
          } else {
            that.userWallet = {
              address: addr,
              balance: data.result.balance,
              nonce: data.result.nonce,
              privateKey: privateKey.toString('hex')
            }

            deferred.resolve({
              result: true
            })
          }
        })
      } else {
        deferred.reject({
          error: 'Invalid private key.'
        })
      }
    } catch (e) {
      deferred.reject({
        error: e
      })
    }
    return deferred.promise()
  }

  /**
   * destroys and resets the userWallet data
   */
  resetWallet(): void {
    this.userWallet = new Wallet()
  }

  /**
   * convert number to array representing the padded hex form
   * @param {number} val - number to be converted
   * @param {number} paddedSize - the size till which val should be padded
   * @returns {Array} array containing the 0-padded hex form (from left to right)
   */
  intToByteArray(val, paddedSize): Array<string>
  {
    var arr = []

    let hexVal = val.toString(16)
    let hexRep = []

    var i
    for(i = 0 ; i < hexVal.length ; i++) {
      hexRep[i] = hexVal[i].toString()
    }

    for(i = 0 ; i < (paddedSize - hexVal.length) ; i++){
      arr.push('0')
    }

    for(i = 0 ; i < hexVal.length ; i++) {
      arr.push(hexRep[i])
    }

    return arr
  }

  /**
   * create a new transaction
   * @param {Object} payment - the details of the transaction
   * @param {string} payment.to - address to which transaction is sent to
   * @param {number} payment.amount - number of zils sent
   * @param {number} payment.gasPrice - gas price for this transaction
   * @param {number} payment.gasLimit - gas limit for this transaction
   * @returns {Promise} Promise object containing the newly created transaction id
   */
  sendPayment(payment: any): Promise<any> {
    var deferred = new $.Deferred()
    let pubKey = secp256k1.publicKeyCreate(new Buffer(this.userWallet.privateKey, 'hex'), true)

    let txn = {
      version: 0,
      nonce: this.userWallet.nonce,
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

    let sig = this.zlib.schnorr.sign(new Buffer(msg, 'hex'), new Buffer(this.userWallet.privateKey, 'hex'), pubKey)
    let r = sig.r.toString('hex')
    let s = sig.s.toString('hex')
    while (r.length < 64) {
      r = '0' + r
    }
    while (s.length < 64) {
      s = '0' + s
    }
    txn['signature'] = r + s

    this.node.createTransaction(txn, function(err, data) {
      if (err || data.error) {
        deferred.reject(err)
      } else {
        deferred.resolve({
          txId: data.result
        })
      }
    })

    return deferred.promise()
  }
}
