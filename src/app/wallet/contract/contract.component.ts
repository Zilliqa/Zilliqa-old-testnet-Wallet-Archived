// Copyright (c) 2018 Zilliqa 
// This source code is being disclosed to you solely for the purpose of your participation in 
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to 
// the protocols and algorithms that are programmed into, and intended by, the code. You may 
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd., 
// including modifying or publishing the code (or any part of it), and developing or forming 
// another public or private blockchain network. This source code is provided ‘as is’ and no 
// warranties are given as to title or non-infringement, merchantability or fitness for purpose 
// and, to the extent permitted by law, all liability for your use of the code is disclaimed. 


import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import { ZilliqaService } from '../../zilliqa.service';
import { NetworkService } from '../../network.service';
import { Editorview } from './editorview.component';
import { Constants } from '../../constants';


@Component({
  selector: 'app-contract',
  templateUrl: './contract.component.html',
  styleUrls: ['./contract.component.css']
})
export class ContractComponent implements OnInit, OnDestroy {

  /* STATES:
   * 0: menu - interact or deploy + contract history
   * 1: deploy contract - scilla editor
   * 2: interact with contract
   */
  state: number

  codeText: string
  initParams: any
  pendingTxns: Array<any>
  createdContracts: Array<any>

  methodInput: any
  contract: any
  pendingMethodCalls: Array<any>

  constructor(private router: Router, public zilliqaService: ZilliqaService, private networkService: NetworkService) {
    this.codeText = Constants.SAMPLE_SCILLA_CODE
    this.state = 0
  }

  ngOnInit() {
    this.methodInput = {
      addr: '',
      methodName: '',
      params: '',
      contractAddr: ''
    }
    this.pendingTxns = []
    this.createdContracts = []
    this.contract = {
      id: '', 
      contractAddr: '',
      methodName: '',
      params:
      [{
        'vname': 'sender',
        'type': 'Address',
        'value': this.zilliqaService.userWallet.address
      }, {
        'vname': 'amount',
        'type': 'Int',
        'value': 0
      }],
      result: '',
      state: {}
    }
    this.pendingMethodCalls = []
    this.initParams = [
      {'vname': 'owner', 'type': 'Address', 'value': '490af4a007ce3d53d568ff335afa037affa1ce65'},
      {'vname': 'max_block', 'type': 'BNum', 'value': '800'},
      {'vname': 'goal', 'type': 'Int', 'value': '500'}
    ]

    setInterval(() => {
      if (this.pendingMethodCalls.length > 0) {
        this.checkPendingMethodCalls()
      }
    }, 5000)
  }

  ngOnDestroy() {
  }

  setState(newState, contractAddr) {
    // optional arg
    if (contractAddr) {
      this.contract.contractAddr = contractAddr
    }

    this.state = newState
  }

  runCode() {
    let that = this
    console.log(`Running Contract Creation...`)

    this.zilliqaService.createContract(this.codeText, this.initParams).then((data) => {
      that.newContractCreated(data.result, data.addr)
    }).catch((err) => {

    })
  }

  newContractCreated(txnid, newContractAddr) {
    let that = this

    let tid = setInterval(() => {
      console.log('Checking for pending txn: ' + txnid)

      // get the index of this txid in the pendingTxns array
      let i = that.pendingTxns.findIndex(txn => txn.id === txnid)
      if (i === -1) return

      that.zilliqaService.checkPendingTxns(txnid, i).then((data) => {
        console.log("Confirmed contract creation transaction: " + txnid)

        // add it to createdContracts array
        that.createdContracts.push({
          txnId: that.pendingTxns[i].tid, 
          contractAddr: that.pendingTxns[i].contractAddr
        })

        // cancel further checking of this txn
        clearInterval(that.pendingTxns[i].tid)

        // remove it from the pendingTxns array
        that.pendingTxns.splice(i, 1)
      }).catch((err) => {
        console.log("Not confirmed till now.")
      })
    }, 5000)

    this.pendingTxns.push({
      id: txnid,
      tid: tid,
      contractAddr: newContractAddr
    })
    console.log(`Deployed contract, waiting for confirmation...`)
  }

  addParam(idx) {
    this.contract.params.push({
      'vname': '',
      'type': '',
      'value': ''
    })
  }

  removeParam(idx) {
    this.contract.params.pop()
  }

  addInitParam(idx) {
    this.initParams.push({
      'vname': '',
      'type': '',
      'value': ''
    })
  }

  removeInitParam(idx) {
    this.initParams.pop()
  }

  getProps(obj) {
    if (obj == undefined) return []

    return Object.keys(obj).map((key) =>{ return {key: key, value: obj[key]} })
  }

  isArray(obj) {
    return (Array.isArray(obj) == true)
  }

  isParamString(obj) {
    return (typeof obj === 'string' || obj instanceof String)
  }

  isParamObject(obj) {
    return (typeof obj === 'object' && obj !== null && !(obj instanceof Array) && !(obj instanceof Date))
  }

  printParam(obj) {
    if (typeof(obj) === 'string' || obj instanceof String) {
      return obj
    } else if (typeof obj === 'object' && obj !== null && !(obj instanceof Array) && !(obj instanceof Date)) {
      return JSON.stringify(obj)
    } else {
      return obj
    }
  }

  callMethod() {
    var contractAddr = this.contract['contractAddr']
    var method = this.contract['methodName']
    var params = this.contract['params']

    let that = this
    this.zilliqaService.callTxnMethod(contractAddr, method, params).then((data) => {
      that.contract.result = that.contract.methodName + " call pending, txnid: " + data.result
      that.pendingMethodCalls.push({callName: that.contract.methodName, txnid: data.result, count: 0})
    })
  }

  checkPendingMethodCalls() {
    let that = this
    for(var i = 0; i < this.pendingMethodCalls.length; i++) {
      console.log(`Checking pending method call: ` + this.pendingMethodCalls[i].callName)

      // increment counter of number of times called, remove when it reaches 10
      if (this.pendingMethodCalls[i].count > 1000) {
        that.contract.result = ""

        that.pendingMethodCalls.splice(i, 1)
        continue
      }
      this.pendingMethodCalls[i].count += 1
      this.zilliqaService.checkPendingTxns(this.pendingMethodCalls[i].txnid, i).then((data) => {
        console.log(`Method call ` + that.pendingMethodCalls[data.index].callName + ` confirmed.`)

        // update the contract variable
        that.contract.result = that.contract.methodName + " call successful."

        // remove it from the array
        that.pendingMethodCalls.splice(data.index, 1)
      }).catch((err) => {
        console.log("Method call not confirmed.")
      })
    }
  }

  callMethodState() {
    console.log(this.contract)
    var contractAddr = this.contract['contractAddr']
    var method = this.contract['methodName']
    var params = this.contract['params']

    let that = this
    this.zilliqaService.getContractState(contractAddr).then((data) => {
      that.contract.state.error = null
      that.contract.state.result = data.result
    }).catch((err) => {
      that.contract.state.error = "State call failed: " + JSON.stringify(err)
      that.contract.state.result = null
    })
  }
}
