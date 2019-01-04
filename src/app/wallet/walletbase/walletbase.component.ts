/*
 * Copyright (C) 2019 Zilliqa
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


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
    this.wallet = new Wallet();
    this.privateKeyDisplay = '****************************************************************'
    this.revealBtn = 'Show'
    this.walletEncryptPassphrase = ''
    this.loading = false
  }

  ngOnInit() {
    this.wallet = this.zilliqaService.getWallet();
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
