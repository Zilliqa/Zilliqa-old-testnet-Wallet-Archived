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


import { Component } from '@angular/core';
import { NgStyle } from '@angular/common';

import { ZilliqaService } from './zilliqa.service';
import { NetworkService } from './network.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  data: any

  constructor(public zilliqaService: ZilliqaService, public networkService: NetworkService) {
    this.data = {
      latestTxBlock: '',
      networkId: ''
    }
  }

  ngOnInit() {
    this.loadNavData()

    // load nav data every 15 seconds
    setInterval(() => {
      this.loadNavData()
    }, 15000)

    // checks the node connection status every 15 seconds
    this.networkService.checkConnection()
  }

  loadNavData() {
    let that = this

    // fetch initial stats
    this.zilliqaService.getInitData().then(function(data) {
      that.data = data
    })
  }
}
