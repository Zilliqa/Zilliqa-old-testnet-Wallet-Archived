// Copyright (c) 2018 Zilliqa 
// This source code is being disclosed to you solely for the purpose of your participation in 
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to 
// the protocols and algorithms that are programmed into, and intended by, the code. You may 
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd., 
// including modifying or publishing the code (or any part of it), and developing or forming 
// another public or private blockchain network. This source code is provided ‘as is’ and no 
// warranties are given as to title or non-infringement, merchantability or fitness for purpose 
// and, to the extent permitted by law, all liability for your use of the code is disclaimed. 


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
        // commented for maintenance
        //that.failedConnection()
      } else {
        //that.successfulConnection()
      }
    }, (err) => {
      //that.failedConnection()
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
