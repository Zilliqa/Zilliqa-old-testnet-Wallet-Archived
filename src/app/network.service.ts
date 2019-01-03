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


import { Injectable } from '@angular/core';

import { ZilliqaService } from './zilliqa.service';
import { Constants } from './constants';
import * as $ from 'jquery';

@Injectable()
export class NetworkService {

  nodeConnected: boolean
  connectionAttempts: number
  nodeStatus: string
  networkBarVisible: boolean

  constructor(private zilliqaService: ZilliqaService) {
    this.nodeConnected = false
    this.connectionAttempts = 0
    this.nodeStatus = 'Connected to network.'
    this.networkBarVisible = true
  }

  checkConnection() {

    let that = this

    if(!(navigator.onLine)) {
      this.failedConnection()
    }

    this.zilliqaService.node.isConnected((err, data) => {
      if (err) {
        that.failedConnection()
      } else {
        that.successfulConnection()
      }
    }, (err) => {
      that.failedConnection()
    })
  }

  successfulConnection() {
    this.nodeConnected = true
    this.connectionAttempts = 0
    this.nodeStatus = 'Connected to the network.'

    // remove the green status in 3 seconds
    setTimeout(() => {this.networkBarVisible = false}, 3000)

    // check the node connection status 15 seconds later
    setTimeout(() => {this.checkConnection()}, 15000)
  }

  failedConnection() {
    this.nodeConnected = false
    this.networkBarVisible = true

    if (this.connectionAttempts < Constants.MAX_CONNECTION_ATTEMPTS) {
      this.nodeStatus = 'Connection attempt ' + this.connectionAttempts++ + ' failed, retrying in ' + (Constants.CONNECTION_ATTEMPT_TIMEOUT * this.connectionAttempts) + 'ms'

      setTimeout(() => {this.checkConnection()}, Constants.CONNECTION_ATTEMPT_TIMEOUT * this.connectionAttempts);
    } else {
      this.nodeStatus = 'Connection failed ' + Constants.MAX_CONNECTION_ATTEMPTS + ' times. Please try again later.'
    }
  }

}
