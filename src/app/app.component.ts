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

import { ZilliqaService } from './zilliqa.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

	data = {}

	constructor(private zilliqaService: ZilliqaService) { 
		this.data = {
			latestDSBlock: '',
			networkId: ''
		}
	}

	ngOnInit() {
		let that = this
		this.zilliqaService.getInitData().then(function(data) {
			that.data = data
		});
	}
}
