// Copyright (c) 2018 Zilliqa 
// This source code is being disclosed to you solely for the purpose of your participation in 
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to 
// the protocols and algorithms that are programmed into, and intended by, the code. You may 
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd., 
// including modifying or publishing the code (or any part of it), and developing or forming 
// another public or private blockchain network. This source code is provided ‘as is’ and no 
// warranties are given as to title or non-infringement, merchantability or fitness for purpose 
// and, to the extent permitted by law, all liability for your use of the code is disclaimed. 


import { Component, OnInit, ChangeDetectorRef } from '@angular/core';


import { Wallet } from '../wallet'
import { ZilliqaService } from '../../zilliqa.service';


@Component({
  selector: 'app-walletbase',
  templateUrl: './walletbase.component.html',
  styleUrls: ['./walletbase.component.css']
})
export class WalletbaseComponent implements OnInit {

  privateKeyDisplay: string
  revealBtn: string
  walletEncryptPassphrase: string
  wallet: Wallet
  userPubkey: string
  loading: boolean

  constructor(public zilliqaService: ZilliqaService, private ref: ChangeDetectorRef) {
    this.wallet = new Wallet()
    this.privateKeyDisplay = '****************************************************************'
    this.revealBtn = 'Show'
    this.walletEncryptPassphrase = ''
    this.loading = false
  }

  ngOnInit() {
    this.wallet = this.zilliqaService.getWallet()
    this.userPubkey = this.zilliqaService.getPublicKeyfromPrivateKey()
    this.zilliqaService.triggerPopup()
  }

  revealPrivateKey() {
    if (this.privateKeyDisplay == undefined || this.privateKeyDisplay.length == 0 || this.privateKeyDisplay[0] != '*') {
      // if privateKey is uninitialized or empty or doesn't begin with *, hide it
      this.privateKeyDisplay = '****************************************************************'
      this.revealBtn = 'Show'
    } else {
      this.privateKeyDisplay = this.wallet.privateKey
      this.revealBtn = 'Hide'
    }
  }

  validPassphrase() {
    return (this.walletEncryptPassphrase && this.walletEncryptPassphrase.length >= 8)
  }

  getWalletFilename() {
    return 'UTC--' + (new Date()).toJSON() + '.0--' + this.wallet.address + '.json'
  }

  downloadWallet() {
    this.loading = true
    this.ref.detectChanges()
    setTimeout(() => {this.downloadWalletAsync()}, 100)
  }

  downloadWalletAsync() {
    let that = this
    this.zilliqaService.generateWalletJson(this.walletEncryptPassphrase).then((data) => {
      let text = data.result

      let filename = that.getWalletFilename()

      // generate file for download
      let element = document.createElement('a')
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
      element.setAttribute('download', filename)
      element.style.display = 'none'
      document.body.appendChild(element)
      element.click()
      document.body.removeChild(element)

      that.loading = false
      that.walletEncryptPassphrase = ''
    })
  }
}
