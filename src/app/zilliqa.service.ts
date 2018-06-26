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
import { secp256k1, randomBytes, pbkdf2Sync, sha3, sha256 } from 'bcrypto';
import * as scryptAsync from 'scrypt-async';
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
  networkLoading: boolean
  popupTriggered: boolean
  recentTxns: Array<any>

  constructor(private http: HttpClient) {
    this.networkLoading = false
    this.popupTriggered = false
    this.userWallet = new Wallet()
    this.recentTxns = []
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
  generateWalletJson(passphrase) {
    var deferred = new $.Deferred()
    var that = this

    let privateKey = new Buffer(this.userWallet.privateKey, 'hex')
    let address = this.userWallet.address

    let salt = randomBytes(32);
    let iv = randomBytes(16);

    // key derivation function used is scrypt along with standard params
    scryptAsync(passphrase, salt, {N: 262144, r: 1, p: 8, dkLen: 32}, function(derivedKey) {
      derivedKey = new Buffer(derivedKey)

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

      deferred.resolve({ 
        result: JSON.stringify(result) 
      })
    })

    return deferred.promise()
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
    let that = this
    var deferred = new $.Deferred()

    // use the passphrase and keystore json file to get private key
    if (passphrase && passphrase.length >= 8) {
      let walletJson = JSON.parse(this.walletData.encryptedWalletFile)

      let ciphertext = new Buffer(walletJson['crypto']['ciphertext'], 'hex')
      let iv = new Buffer(walletJson['crypto']['cipherparams']['iv'], 'hex')
      let salt = new Buffer(walletJson['crypto']['kdfparams']['salt'], 'hex')
      let kdfparams = walletJson['crypto']['kdfparams']
      
      // recreate the derived key using scrypt and the same parameters
      scryptAsync(passphrase, salt, {N: kdfparams['n'], r: kdfparams['r'], p: kdfparams['p'], dkLen: kdfparams['dklen']}, function(derivedKey) {
        derivedKey = new Buffer(derivedKey, 'hex')

        // check passphrase using mac
        let mac = sha3.digest(Buffer.concat([derivedKey.slice(16, 32), ciphertext])).toString('hex')      
        if (mac.toLowerCase() !== walletJson['crypto']['mac'].toLowerCase()) {
          // Incorrect passphrase
          deferred.resolve({result: false})
        }

        let aesctr = new aesjs.ModeOfOperation.ctr(derivedKey.slice(0, 16), new aesjs.Counter(iv))
        let decryptedSeed = aesctr.decrypt(ciphertext);

        deferred.resolve({
          result: new Buffer(decryptedSeed).toString('hex')
        })
      })
    } else {      
      deferred.resolve({result: false})
    }
    return deferred.promise()
  }

  updateAccount(): Promise<any> {
    // fetch account balance and nonce
    var deferred = new $.Deferred();
    let that = this

    this.node.getBalance({address: this.userWallet.address}, function(err, data) {
      if (err || data.error) {
        // if network isn't working
        that.userWallet.balance = 0
        that.userWallet.nonce = 0
        deferred.resolve()
        console.log(`Couldn't fetch account details, balance: ` + that.userWallet.balance + `, nonce: ` + that.userWallet.nonce)
      } else {
        that.userWallet.balance = data.result.balance
        that.userWallet.nonce = data.result.nonce
        console.log(`Fetched account details successfully, balance: ` + that.userWallet.balance + `, nonce: ` + that.userWallet.nonce)
        deferred.resolve()
      }
    })

    return deferred.promise()
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
    this.startLoading()
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
          that.endLoading()
        })
      } else {
        deferred.reject({
          error: 'Invalid private key.'
        })
        this.endLoading()
      }
    } catch (e) {
      deferred.reject({
        error: e
      })
      this.endLoading()
    }
    return deferred.promise()
  }

  /**
   * destroys and resets the userWallet data
   */
  resetWallet(): void {
    this.userWallet = new Wallet()

    // clear any recentTxns and pending timers
    for (var i = 0 ; i < this.recentTxns.length ; i++) {
      clearInterval(this.recentTxns[i].tid)
    }
    this.recentTxns = []
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
    this.startLoading()
    var deferred = new $.Deferred()

    let txn = this.zlib.util.createTransactionJson(this.userWallet.privateKey, {
      version: 0,
      nonce: this.userWallet.nonce + 1,
      to: payment.address,
      amount: payment.amount,
      gasPrice: payment.gasPrice,
      gasLimit: payment.gasLimit
    })

    let that = this
    this.node.createTransaction(txn, function(err, data) {
      if (err || data.error) {
        deferred.reject(err)
      } else {
        // add to local cached list
        that.addLocalTxn({txnId: data.result, amount: txn.amount, toAddr: txn.to})

        deferred.resolve({
          txId: data.result
        })
      }
      that.endLoading()
    })

    return deferred.promise()
  }

  addLocalTxn(args) {
    let that = this

    let tid = setInterval(() => {
      that.node.getTransaction({txHash: args.txnId}, function(err, data) {
        if (err || data.result.error || !data.result['ID']) {
          return
        } else {
          let id = data.result['ID']
          let amount = data.result['amount']
          let toAddr = data.result['toAddr']
          console.log(id, amount, toAddr)
          
          // get the index of this txn in the recentTxns array
          let i = that.recentTxns.findIndex(txn => txn.txHash === id)
          if (i == -1) return

          that.recentTxns[i]['confirmed'] = true
          that.recentTxns[i]['id'] = id
          that.recentTxns[i]['amount'] = amount
          that.recentTxns[i]['toAddr'] = toAddr

          // cancel further checking of this txn
          clearInterval(that.recentTxns[i].tid)
        }
      })
    }, 5000)

    this.recentTxns.push({
      id: args.txnId, 
      tid: tid, 
      confirmed: false, 
      amount: args.amount, 
      toAddr: args.toAddr
    })
  }

  // methods for scilla editor and smart contracts


  /**
   * run the code and return txid
   * @returns {Promise} Promise object containing the required data
   */
  createContract(codeStr, initParams, amount, gas): Promise<any> {
    this.startLoading()
    var deferred = new $.Deferred();
    let that = this

    // setup a dummy transaction
    var toPubKey = sha256.digest(new Buffer('', 'hex'))// sha256 hash of empty string for contract creation
    let toAddr = toPubKey.toString('hex', 12) // rightmost 160 bits/20 bytes

    // always update account to ensure latest nonce
    this.updateAccount().then(() => {
      console.log('now nonce is ' + that.userWallet.nonce)
      var txn = this.zlib.util.createTransactionJson(this.userWallet.privateKey, {
        version: 0,
        nonce: +that.userWallet.nonce + 1,
        to: '0000000000000000000000000000000000000000',
        amount: amount,
        gasPrice: 1,
        gasLimit: gas,
        code: codeStr,
        data: JSON.stringify(initParams).replace(/\\"/g, '"')
      })
      console.log('sending txn:')
      console.log(txn)

      this.node.createTransaction(txn, function (err, data) {
        if (err || data.error) {
          deferred.reject(err)
        } else {
          // generate the address of the newly created contract
          let nonceStr = that.zlib.util.intToByteArray(that.userWallet.nonce, 64).join('')
          let newstr = that.userWallet.address + nonceStr

          var contractPubKey = sha256.digest(new Buffer(newstr, 'hex'))// sha256 hash of address+nonce
          var contractAddr = contractPubKey.toString('hex', 12) // rightmost 160 bits/20 bytes

          console.log('Contract should be deployed at address ' + contractAddr + ' soon.')

          deferred.resolve({
            result: data.result,
            addr: contractAddr
          })
        }
        that.endLoading()
      })
    })
    return deferred.promise()
  }

  getContractHistory(): Promise<any> {
    this.startLoading()
    var deferred = new $.Deferred();
    let that = this

    this.node.getSmartContracts({address: this.userWallet.address}, function (err, data) {
      if (err || data.error) {
        deferred.reject(err)
      } else {
         deferred.resolve({
          result: data.result
        })
      }
      that.endLoading()
    })
    return deferred.promise()
  }

  checkPendingTxns(txnid, idx): Promise<any> {
    this.startLoading()
    var deferred = new $.Deferred();
    let that = this

    this.node.getTransaction({txHash: txnid}, function (err, data) {
      if (err || data.error || data.result.error) {
        deferred.reject(err)
      } else {
        deferred.resolve({
          result: data.result,
          index: idx
        })
      }
      that.endLoading()
    })

    return deferred.promise()
  }

  callTxnMethod(addr, method, amount, gas, params): Promise<any> {
    this.startLoading()
    var deferred = new $.Deferred();
    let that = this

    var data = JSON.stringify({
      '_from': this.userWallet.address,
      '_tag': method,
      '_amount': amount,
      'params': params
    })

    // always update account to ensure latest nonce
    this.updateAccount().then(() => {
      // setup a dummy transaction
      var txn = that.zlib.util.createTransactionJson(that.userWallet.privateKey, {
        version: 0,
        nonce: +that.userWallet.nonce + 1,
        to: addr,
        amount: amount,
        gasPrice: 1,
        gasLimit: gas,
        data: data
      })
    
      console.log('Sending txn...')
      console.log(txn)

      this.node.createTransaction(txn, function (err, data) {
        if (err || data.error) {
          console.log(err || data.error)
          deferred.reject(err)
        } else {
          console.log(data.result)

          deferred.resolve({
            result: data.result
          })
        }
        that.endLoading()
      })
    })

    return deferred.promise()
  }

  getContractState(addr): Promise<any> {
    this.startLoading()
    var deferred = new $.Deferred();
    let that = this

    this.node.getSmartContractState({address: addr}, function (err, data) {
      if (err || (data.result && data.result.Error)) {
        deferred.reject(err)
      } else {
        deferred.resolve({
          result: data.result
        })
      }
      that.endLoading()
    })

    return deferred.promise()
  }

  getContractCode(addr): Promise<any> {
    this.startLoading()
    var deferred = new $.Deferred();
    let that = this

    this.node.getSmartContractCode({address: addr}, function (err, data) {
      if (err || (data.result && data.result.Error)) {
        deferred.reject(err)
      } else {
        deferred.resolve({
          result: data.result
        })
      }
      that.endLoading()
    })

    this.endLoading()

    return deferred.promise()
  }

  checkContractCode(code): Promise<any> {
    this.startLoading()
    var deferred = new $.Deferred();
    let that = this

    this.node.checkCode({code: code}, function (err, data) {
      if (err || (data.result && data.result.Error)) {
        deferred.reject(err)
      } else {
        deferred.resolve({
          result: data
        })
      }
      that.endLoading()
    })

    return deferred.promise()
  }

  checkContractCodeTest(code, init, blockchain, state, msg): Promise<any> {
    this.startLoading()
    var deferred = new $.Deferred();
    let that = this

    this.node.checkCodeTest({code: code, init: init, blockchain: blockchain, state: state, message: msg}, function (err, data) {
      if (err || (data.result && data.result.Error)) {
        deferred.reject(err)
      } else {
        deferred.resolve({
          result: data
        })
      }
      that.endLoading()
    })

    return deferred.promise()
  }



  startLoading() {
    setTimeout(() => {this.networkLoading = true}, 0)
  }

  endLoading() {
    setTimeout(() => {this.networkLoading = false}, 0)
  }

  triggerPopup() {
    if (!this.popupTriggered) {
      this.popupTriggered = true
      $("#modalButton").click()
    }
  }
}
