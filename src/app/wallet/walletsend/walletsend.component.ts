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
const MIN_GAS_PRICE = 10 ** 9;
const MIN_GAS_LIMIT = 1;
const DECIMALS = 10 ** 6;

import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from "@angular/core";

import { BN, units } from "@zilliqa-js/util";

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
      // the final number has to be an integer
      (this.payment.amount * 10 ** 12) % 1 !== 0 ||
      units
        .toQa(this.payment.amount, units.Units.Zil)
        .gt(new BN(this.wallet.balance))
    );
  }

  invalidPayment() {
    let addr = this.convertHexAddress();

    // true if address invalid or recaptcha not filled or invalidAmount()
    return (
      !addr.match(/^[0-9a-fA-F]{40}$/) ||
      !this.recaptchaFilled ||
      this.invalidAmount()
    );
  }

  onSend() {
    this.payment.address = this.convertHexAddress();
    // @ts-ignore
    this.payment.amount = units
      .toQa(this.payment.amount, units.Units.Zil)
      .toString();

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
