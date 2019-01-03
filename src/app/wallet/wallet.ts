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
