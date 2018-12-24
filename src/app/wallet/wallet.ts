// Copyright (c) 2018 Zilliqa
// This source code is being disclosed to you solely for the purpose of your participation in
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to
// the protocols and algorithms that are programmed into, and intended by, the code. You may
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd.,
// including modifying or publishing the code (or any part of it), and developing or forming
// another public or private blockchain network. This source code is provided ‘as is’ and no
// warranties are given as to title or non-infringement, merchantability or fitness for purpose
// and, to the extent permitted by law, all liability for your use of the code is disclaimed.
import { BN, units } from "@zilliqa-js/util";

const DECIMALS = 10 ** 6;

interface WalletFields {
  address?: string;
  privateKey?: string;
  balance?: number;
  nonce?: number;
}

export class Wallet {
  address: string;
  privateKey: string;
  balance: number;
  nonce: number;

  constructor(fields?: WalletFields) {
    if (!fields) {
      return;
    }

    this.address = fields.address || "";
    this.privateKey = fields.privateKey || "";
    this.balance = fields.balance || 0;
    this.nonce = fields.nonce || 0;
  }

  getZilBalance(): number {
    const inQa = new BN(this.balance);
    const inZil = units.fromQa(inQa, units.Units.Zil);

    return Math.round(parseFloat(inZil) * DECIMALS) / DECIMALS;
  }
}
