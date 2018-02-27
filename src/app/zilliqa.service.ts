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

import $ from 'jquery';
import { Wallet } from './wallet/wallet';
import { zLib } from 'z-lib';
import {secp256k1, hash256} from 'bcrypto';
import sha3 from 'bcrypto/lib/sha3';
import schnorr from 'schnorr';


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
        if (err) deferred.reject(err);

        deferred.resolve({
          networkId: data1.result,
          latestDSBlock: data2.result
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
    // let walletJson = {
    //   "address": this.userWallet.address,
    //   "crypto":{
    //     "cipher":"aes-128-ctr",
    //     "ciphertext":"0f6d343b2a34fe571639235fc16250823c6fe3bc30525d98c41dfdf21a97aedb",
    //     "cipherparams":{
    //       "iv":"cabce7fb34e4881870a2419b93f6c796"
    //     },
    //     "kdf":"scrypt",
    //     "kdfparams": {
    //       "dklen": 32,
    //       "n": 262144,
    //       "p": 1,
    //       "r": 8,
    //       "salt": "1af9c4a44cf45fe6fb03dcc126fa56cb0f9e81463683dd6493fb4dc76edddd51"
    //     },
    //     "mac":"5cf4012fffd1fbe41b122386122350c3825a709619224961a16e908c2a366aa6"
    //   },
    //   "id":"eddd71dd-7ad6-4cd3-bc1a-11022f7db76c",
    //   "version": 3
    // }
    return "TEST" // walletJson
  }

  checkEncryptedWallet() {
    // todo - verify that the encrypted wallet uploaded by user has a valid structure
    if (this.walletData.encryptedWalletFile == null) 
      return false

    return true
  }

  decryptWalletFile(passphrase) {
    // todo - use the passphrase and this.walletData.encryptedWalletFile to get private key
    if (passphrase && passphrase.length > 0) {
      this.importWallet('11235fa10eff017b2362642e473017674a5f20c3239c4304dcfada2f39b2ebed')
      return 1
    } else {
      return 0
    }
  }

  getBalance(address) {
    var deferred = new $.Deferred()

    this.node.getBalance({address: address}, function(err, data) {
      if (err) deferred.reject(err)

      deferred.resolve({
        address: address,
        balance: data.result
      })
    })

    return deferred.promise()
  }

  createWallet() {
    let key = secp256k1.generatePrivateKey()
    let pub = secp256k1.publicKeyCreate(key, true)

    let publicKeyHash = sha3.digest(pub) // sha3 hash of the public key
    let address = publicKeyHash.toString('hex', 12) // rightmost 160 bits/20 bytes of the hash

    this.userWallet = {
      address: address,
      privateKey: key.toString('hex'),
      balance: 0
    }

    return {privateKey: key.toString('hex')}
  }

  importWallet(privateKey) {
    // check if private key valid
    try {
      if (secp256k1.privateKeyVerify(Buffer.from(privateKey, 'hex'))) {
        // todo - fetch address/balance/nonce
        this.userWallet = {
          address: '8fad8e7253f1b0cb776d6ee5866fe568ec9c45b9', // sample public address
          balance: 0,
          privateKey: privateKey.toString('hex')
        }
        return true
      }
    } catch (e) {
      // console.log(e)
    }
    return false
  }

  parseWallet(uploadedWallet: File) {

  }

  resetWallet() {
    this.userWallet = new Wallet()
  }

  sendPayment(payment) {
    // checkValid(payment.address)
    var deferred = new $.Deferred()

    let tx = {
      nonce: 0,
      to: payment.address,
      amount: payment.amount,
      pubKey: '',
      gasPrice: payment.gasPrice,
      gasLimit: payment.gasLimit
    }

    this.node.createTransaction(tx, function(err, data) {
      if (err) deferred.reject(err)

      deferred.resolve({
        txId: data.result
      })
    })

    return deferred.promise()
  }

  getTxHistory() {
    var deferred = new $.Deferred()

    this.node.getTransactionHistory({address: this.userWallet.address}, function(err, data) {
      if (err) deferred.reject(err)

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
    })

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

  // searchHeroes(term: string): Observable<Hero[]> {
  //   if (!term.trim()) {
  //     // return empty array in case of blank search term
  //     return of([]);
  //   }
  //   return this.http.get<Hero[]>(`api/heroes/name=${term}`)
  //     .pipe(
  //       catchError(this.handleError<Hero[]>('searchHeroes', []))
  //     );
  // }

  //  getHeroes(): Observable<Hero[]> {
  //   return this.http.get<Hero[]>(this.heroesUrl)
  //     .pipe(
  //       catchError(this.handleError('getHeroes', []));
  //     );
  // }

  // getHero(id: number): Observable<Hero> {
  //   const url = `${this.heroesUrl}/${id}`;

  //   return this.http.get<Hero>(url)
  //     .pipe(
  //       catchError(this.handleError<Hero>(`getHero id=${id}`));
  //     );
  // }

  // updateHero(id: number): Observable<any> {
  //   return this.http.put(this.heroesUrl, hero, httpOptions)
  //     .pipe(
  //       catchError(this.handleError<any>('updateHero'))
  //     );
  // }
}
