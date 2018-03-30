// Copyright (c) 2018 Zilliqa 
// This source code is being disclosed to you solely for the purpose of your participation in 
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to 
// the protocols and algorithms that are programmed into, and intended by, the code. You may 
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd., 
// including modifying or publishing the code (or any part of it), and developing or forming 
// another public or private blockchain network. This source code is provided ‘as is’ and no 
// warranties are given as to title or non-infringement, merchantability or fitness for purpose 
// and, to the extent permitted by law, all liability for your use of the code is disclaimed. 


import { Component, Input, OnInit, OnDestroy } from '@angular/core'

import { Wallet } from '../wallet'
import { Payment } from './payment'
import { ZilliqaService } from '../../zilliqa.service'


@Component({
  selector: 'app-walletsend',
  templateUrl: './walletsend.component.html',
  styleUrls: ['./walletsend.component.css']
})

export class WalletsendComponent implements OnInit {

  /* STATES:
   * 0: send payment - input
   * 1: send payment - pending transaction
   */
  state: number
  pendingTxId: string
  wallet: Wallet
  payment: Payment

  constructor(private zilliqaService: ZilliqaService) { 
    this.state = 0
    this.pendingTxId = null
    this.wallet = new Wallet()
    this.payment = new Payment()
  }

  ngOnInit() {
    this.wallet = this.zilliqaService.getWallet()
    this.payment = {
      amount: 0,
      address: '',
      gasPrice: 0,
      gasLimit: 0
    }
  }

  ngOnDestroy() {
    this.payment = new Payment()
    this.pendingTxId = null
    this.setState(0)
  }

  setState(newState) {
    this.state = newState
  }

  invalidAddress() {
    // show error if address not valid and some input already entered by user
    return (this.payment.address.length > 0 && !(this.payment.address.match(/^[0-9a-fA-F]{40}$/)))
  }

  invalidAmount() {
    return (this.payment.amount < 0) || (this.payment.amount > this.wallet.balance)
  }

  invalidPayment() {
    // disable button - can't reuse invalidAddress as 0 length also not allowed
    return (!(this.payment.address.match(/^[0-9a-fA-F]{40}$/)) || this.invalidAmount())
  }

  onSend() {
    let that = this
    this.zilliqaService.sendPayment(this.payment).then((data) => {
      that.pendingTxId = data.txId
      that.setState(1)
      that.zilliqaService.refreshBalance().then((data) => {})
    }, (err) => {
      that.setState(3)
    })
  }

}
