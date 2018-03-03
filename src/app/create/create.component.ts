// Copyright (c) 2018 Zilliqa 
// This source code is being disclosed to you solely for the purpose of your participation in 
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to 
// the protocols and algorithms that are programmed into, and intended by, the code. You may 
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd., 
// including modifying or publishing the code (or any part of it), and developing or forming 
// another public or private blockchain network. This source code is provided ‘as is’ and no 
// warranties are given as to title or non-infringement, merchantability or fitness for purpose 
// and, to the extent permitted by law, all liability for your use of the code is disclaimed. 


import { Component, Input, OnInit } from '@angular/core';

import { Wallet } from '../wallet/wallet'
import { ZilliqaService } from '../zilliqa.service';


@Component({
  selector: 'app-create',
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.css']
})
export class CreateComponent implements OnInit {

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
  wallet: Wallet
  
  @Input() importPrivateKey = ''

  constructor(private zilliqaService: ZilliqaService) { 
    this.state = 0;
    this.wallet = new Wallet()
  }

  ngOnInit() {
    this.state = 0;
    this.wallet = new Wallet()
  }

  setState(newState) {
    if (newState == 0) {
      // reset all variables in create wallet flow
      this.wallet = new Wallet()
      this.generatedPrivateKey = '';
    }
    if ([7,8,9].indexOf(newState) > -1) {
      // reset all variables in import wallet flow
      this.uploadedWallet = null
      this.walletDecryptKey = ''
    }
    this.state = newState;
  }

  generateWallet() {
    this.generatedPrivateKey = this.zilliqaService.createWallet().privateKey
    this.wallet = this.zilliqaService.getWallet()
    this.setState(2);
  }

  importWallet() {
    if (this.zilliqaService.importWallet(this.importPrivateKey))
      this.setState(6)
    else
      this.setState(7)
  }

  selectWallet(files: FileList) {
    this.uploadedWallet = files.item(0)
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
      this.setState(9);
    }
    if (this.zilliqaService.decryptWalletFile(this.walletDecryptKey)) {
      // correct passphrase
      this.setState(6)
    } else {
      // incorrect passphrase
      this.setState(8)
    }
  }
}
