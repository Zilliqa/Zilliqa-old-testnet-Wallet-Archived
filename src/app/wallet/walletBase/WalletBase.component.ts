// Copyright (c) 2018 Zilliqa 
// This source code is being disclosed to you solely for the purpose of your participation in 
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to 
// the protocols and algorithms that are programmed into, and intended by, the code. You may 
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd., 
// including modifying or publishing the code (or any part of it), and developing or forming 
// another public or private blockchain network. This source code is provided ‘as is’ and no 
// warranties are given as to title or non-infringement, merchantability or fitness for purpose 
// and, to the extent permitted by law, all liability for your use of the code is disclaimed. 


import { Component, OnInit } from '@angular/core';

import { Wallet } from '../wallet'
import { ZilliqaService } from '../../zilliqa.service';


@Component({
  selector: 'app-wallet-base',
  templateUrl: './WalletBase.component.html',
  styleUrls: ['./WalletBase.component.css']
})
export class WalletBaseComponent implements OnInit {

  privateKey: string
	wallet: Wallet

  constructor(private zilliqaService: ZilliqaService) {
  	this.wallet = new Wallet()
    this.privateKey = '**************************'
  }

  ngOnInit() {
    this.wallet = this.zilliqaService.getWallet()
  }

  revealPrivateKey() {
    if (this.privateKey == undefined || this.privateKey.length == 0 || this.privateKey[0] != '*')
      // if privateKey is uninitialized or empty or doesn't begin with *, hide it
      this.privateKey = '**************************'
    else
      this.privateKey = this.wallet.address
  }

  downloadWallet() {
    let text = this.zilliqaService.generateWalletJson('testPassphrase')

    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', 'wallet.json');

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }
}
