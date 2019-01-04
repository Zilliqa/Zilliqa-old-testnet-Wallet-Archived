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


import { Component, Input, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';

import { Wallet } from '../wallet/wallet'
import { ZilliqaService } from '../zilliqa.service';


@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css']
})
export class CreateComponent implements OnInit, OnDestroy {

  /* STATES:
   * 0: start view - create or access wallet
   * 1: create wallet - click to generate
   * 2: create wallet - successfully generated
   * 3: import wallet - show options
   * 4: import wallet - import json
   * 5: import wallet - enter key
   * 6: import wallet - successfully imported
   * 7: import wallet - invalid private key
   * 8: import wallet - incorrect passphrase
   * 9: import wallet - incorrect passphrase
   */
  state: number
  generatedPrivateKey: string
  uploadedWallet: File = null
  walletDecryptKey: string
  walletFilename: string
  wallet: Wallet
  userPubkey: string
  loading: boolean
  
  @Input() importPrivateKey = ''

  constructor(private zilliqaService: ZilliqaService, private ref: ChangeDetectorRef) {
    // clear existing wallet if any
    this.zilliqaService.resetWallet()
    this.state = 0;
    this.wallet = new Wallet()
    this.loading = false
  }

  ngOnInit() {
    this.state = 0;
    this.wallet = new Wallet()
    this.loading = false
    this.walletFilename = ''
    this.userPubkey = ''
  }

  ngOnDestroy() {
    this.wallet = new Wallet()
    this.generatedPrivateKey = ''
    this.loading = false
    this.walletFilename = ''
  }

  setState(newState) {
    if (newState == 0) {
      // reset all variables in create wallet flow
      this.wallet = new Wallet()
      this.generatedPrivateKey = ''
      this.loading = false
      this.walletFilename = ''
    }

    if ([7,8,9].indexOf(newState) > -1) {
      // reset all variables in import wallet flow
      this.uploadedWallet = null
      this.walletDecryptKey = ''
    }

    this.state = newState;

    if (newState == 2) {
      this.zilliqaService.triggerPopup()
    }
  }

  generateWallet() {
    this.generatedPrivateKey = this.zilliqaService.createWallet()
    this.wallet = this.zilliqaService.getWallet()
    this.userPubkey = this.zilliqaService.getPublicKeyfromPrivateKey()
    this.setState(2);
  }

  importWallet() {
    let that = this

    this.zilliqaService.importWallet(this.importPrivateKey).then(function(data) {
      if (data.result)
        that.setState(6)
      else
        that.setState(7)
    }, function(data) {
      that.setState(10)
    })
  }

  invalidPrivateKey() {
    // show error if user-entered private key is not valid and atleast some input is entered 
    return (this.importPrivateKey.length > 0 && !(this.importPrivateKey.match(/^[0-9a-fA-F]{64}$/)))
  }

  invalidImportBtn() {
    // disable import button - can't reuse invalidPrivateKey as 0 length also not allowed
    return !(this.importPrivateKey.match(/^[0-9a-fA-F]{64}$/))
  }

  selectWallet(files: FileList) {
    this.uploadedWallet = files.item(0)
    this.walletFilename = files.item(0).name

    let reader = new FileReader()
    let that = this

    reader.onload = function(event) {
      let contents = event.target['result']
      that.zilliqaService.uploadWalletFile(contents)
    }

    reader.readAsText(this.uploadedWallet)
  }

  decryptWallet() {
    if (!(this.zilliqaService.checkEncryptedWallet())) {
      // check if encrypted wallet is valid
      this.setState(9)
    }
    this.loading = true
    this.ref.detectChanges()
    setTimeout(() => {this.decryptWalletAsync()}, 100)
  }

  decryptWalletAsync() {
    let that = this
    
    this.zilliqaService.decryptWalletFile(this.walletDecryptKey).then((data) => {
      that.loading = false
      that.zilliqaService.importWallet(data.result).then((data1) => {
        if (data1.result) {
          that.setState(6) // correct passphrase & balance fetched successfully
        } else {
          that.setState(8) // incorrect passphrase or getBalance call failed
        }
      }, function(data) {
        that.setState(10)
      })
    })
  }
}
