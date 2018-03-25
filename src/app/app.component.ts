// Copyright (c) 2018 Zilliqa 
// This source code is being disclosed to you solely for the purpose of your participation in 
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to 
// the protocols and algorithms that are programmed into, and intended by, the code. You may 
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd., 
// including modifying or publishing the code (or any part of it), and developing or forming 
// another public or private blockchain network. This source code is provided ‘as is’ and no 
// warranties are given as to title or non-infringement, merchantability or fitness for purpose 
// and, to the extent permitted by law, all liability for your use of the code is disclaimed. 


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

  data: object

  constructor(private zilliqaService: ZilliqaService, private networkService: NetworkService) {
    this.data = {
      latestDSBlock: '',
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
