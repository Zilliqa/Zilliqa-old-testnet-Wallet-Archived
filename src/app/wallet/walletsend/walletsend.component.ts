// Copyright (c) 2018 Zilliqa
// This source code is being disclosed to you solely for the purpose of your participation in
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to
// the protocols and algorithms that are programmed into, and intended by, the code. You may
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd.,
// including modifying or publishing the code (or any part of it), and developing or forming
// another public or private blockchain network. This source code is provided ‘as is’ and no
// warranties are given as to title or non-infringement, merchantability or fitness for purpose
// and, to the extent permitted by law, all liability for your use of the code is disclaimed.
const MIN_GAS_PRICE = 10 ** 9;
const MIN_GAS_LIMIT = 1;

import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from "@angular/core";

import { Wallet } from "../wallet";
import { Payment } from "./payment";
import { ZilliqaService } from "../../zilliqa.service";
import * as $ from "jquery";

declare var grecaptcha: any;

@Component({
  selector: "app-walletsend",
  templateUrl: "./walletsend.component.html",
  styleUrls: ["./walletsend.component.css"]
})
export class WalletsendComponent implements OnInit {
  /* STATES:
   * 0: send payment - input
   * 1: send payment - pending transaction
   */
  state: number;
  pendingTxId: string;
  wallet: Wallet;
  payment: Payment;
  recaptchaFilled: boolean;

  constructor(
    public zilliqaService: ZilliqaService,
    private ref: ChangeDetectorRef
  ) {
    this.state = 0;
    this.pendingTxId = null;
    this.wallet = new Wallet();
    this.payment = new Payment();
    this.recaptchaFilled = false;
  }

  ngOnInit() {
    this.wallet = this.zilliqaService.getWallet();
    this.payment = {
      amount: 1,
      address: "",
      gasPrice: MIN_GAS_PRICE,
      gasLimit: MIN_GAS_LIMIT
    };

    // recaptcha hack
    this.initRecaptcha();
  }

  initRecaptcha() {
    let that = this;

    if ($(".g-recaptcha").length > 0) {
      grecaptcha.render("recaptcha", {
        sitekey: "6LfB808UAAAAABr8IkcXDwjj4_G6eRURtVgkj-i9",
        callback: function(data) {
          that.recaptchaFilled = true;
          that.ref.detectChanges();
        }
      });
      return;
    }
    window.setTimeout(this.initRecaptcha.bind(this), 1000);
  }

  ngOnDestroy() {
    this.payment = new Payment();
    this.pendingTxId = null;
    this.recaptchaFilled = false;
    this.setState(0);
  }

  setState(newState) {
    this.state = newState;
  }

  convertHexAddress() {
    if (this.payment.address && this.payment.address.substr(0, 2) == "0x") {
      return this.payment.address.substr(2);
    } else {
      return this.payment.address;
    }
  }

  invalidAddress() {
    let addr = this.convertHexAddress();

    // true if address not valid and some input already entered by user
    return addr.length > 0 && !addr.match(/^[0-9a-fA-F]{40}$/);
  }

  invalidAmount() {
    // true if blank or negative or higher than wallet balance - 0 is not allowed
    return (
      this.payment.amount == null ||
      this.payment.amount <= 0 ||
      this.payment.amount > this.wallet.balance
    );
  }

  invalidGas() {
    // true if blank or negative or higher than wallet balance - 0 is not allowed
    return (
      this.payment.gasLimit == null ||
      this.payment.gasLimit <= 0 ||
      this.payment.gasPrice < MIN_GAS_PRICE ||
      this.payment.gasLimit * this.payment.gasPrice >
        this.zilliqaService.userWallet.balance
    );
  }

  invalidPayment() {
    let addr = this.convertHexAddress();

    // true if address invalid or recaptcha not filled or invalidAmount()
    return (
      !addr.match(/^[0-9a-fA-F]{40}$/) ||
      !this.recaptchaFilled ||
      this.invalidAmount() ||
      this.invalidGas()
    );
  }

  onSend() {
    this.payment.address = this.convertHexAddress();

    let that = this;
    this.zilliqaService.sendPayment(this.payment).then(
      data => {
        that.pendingTxId = data.txId;
        grecaptcha.reset();
        that.setState(1);
        that.zilliqaService.refreshBalance().then(data => {});
      },
      err => {
        grecaptcha.reset();
        that.setState(3);
      }
    );
  }
}
