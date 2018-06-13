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
import { Jsonview } from './jsonview.component';
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
  pendingTxns: Array<any>
  createdContracts: Array<any>
  contractHistory: Array<any>
  methodCheckTimer: any

  // select dropdown placeholder variable
  sampleContract: number

  methodInput: any
  contract: any
  pendingMethodCalls: Array<any>

  constructor(private router: Router, public zilliqaService: ZilliqaService, private networkService: NetworkService) {
    this.codeText = Constants.SAMPLE_SCILLA_CODES[0]
    this.sampleContract = 0
    this.state = 0
  }

  ngOnInit() {
    this.initData()
    this.loadData()

    this.methodCheckTimer = setInterval(() => {
      if (this.pendingMethodCalls.length > 0) {
        this.checkPendingMethodCalls()
      }
    }, 5000)
  }

  initData() {
    this.methodInput = {
      addr: '',
      methodName: '',
      params: '',
      contractAddr: ''
    }
    this.pendingTxns = []
    this.createdContracts = []
    this.contractHistory = []
    this.contract = {
      id: '', 
      contractAddr: '',
      methodName: '',
      amount: 0,
      params:
      [],
      result: '',
      state: {},
      code: {},
      ABI: {}
    }
    this.pendingMethodCalls = []
  }

  loadData() {
    let that = this
    this.zilliqaService.getContractHistory().then((data) => {
      that.contractHistory = data.result
    })
  }

  ngOnDestroy() {
    for(var i = 0 ; i < this.pendingTxns.length ; i++) {
      clearInterval(this.pendingTxns[i].tid)
    }
    clearInterval(this.methodCheckTimer)

    this.initData()
  }

  setState(newState, contractAddr) {
    // optional arg
    if (contractAddr) {
      let that = this
      this.contract.contractAddr = contractAddr

      this.refreshContract()
    }

    this.state = newState
  }

  runCode() {
    let that = this
    console.log(`Running Contract Creation...`)

    this.zilliqaService.createContract(this.codeText, this.contract.ABI.initParams).then((data) => {
      that.newContractCreated(data.result, data.addr)
    }).catch((err) => {

    })
  }

  checkCode() {
    let that = this
    console.log(`Running Contract Check...`)

    this.contract.ABI.initParams = that.parseInitParams(this.codeText)

    // this.zilliqaService.checkContract(this.codeText, this.contract.ABI.initParams).then((data) => {
    // }).catch((err) => {
    // })
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

  addParam() {
    this.contract.params.push({
      'vname': '',
      'type': '',
      'value': ''
    })
  }

  removeParam() {
    this.contract.params.pop()
  }

  invalidAmount() {
    // true if blank or negative or higher than wallet balance - 0 is allowed
    return (this.contract.amount == null) || (this.contract.amount < 0) || (this.contract.amount > this.zilliqaService.userWallet.balance)
  }

  checkBalance() {
    // false if balance < 50
    return (this.zilliqaService.userWallet.balance < 50)
  }

  updateSampleContract(newContract) {
    this.codeText = Constants.SAMPLE_SCILLA_CODES[newContract]
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
    var contractAddr = this.contract.contractAddr
    var method = this.contract.methodName
    var params = this.contract.params
    var amount = this.contract.amount

    let that = this
    this.zilliqaService.callTxnMethod(contractAddr, method, amount, params).then((data) => {
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

  refreshContract() {
    this.refreshContractCode()
    this.refreshContractState()
  }

  refreshContractState() {
    var contractAddr = this.contract['contractAddr']

    let that = this
    this.zilliqaService.getContractState(contractAddr).then((data) => {
      that.contract.state.error = null
      that.contract.state.result = data.result
    }).catch((err) => {
      that.contract.state.error = "Contract state call failed: " + JSON.stringify(err)
      that.contract.state.result = null
    })
  }

  refreshContractCode() {
    var contractAddr = this.contract['contractAddr']

    let that = this
    this.zilliqaService.getContractCode(contractAddr).then((data) => {
      that.contract.code.error = null
      that.contract.code.result = data.result
      that.codeText = that.contract.code.result

      // parse the code to get the selectedTransitions
      that.contract.ABI.transitions = that.parseTransitions(that.contract.code.result)
      that.contract.ABI.initParams = that.parseInitParams(that.contract.code.result)
    }).catch((err) => {
      that.contract.code.error = "Contract code call failed: " + JSON.stringify(err)
      that.codeText = that.contract.code.error
      that.contract.code.result = null
      that.contract.ABI = {}
    })
  }

  parseTransitions(str) {
    var list = []
    str = this.removeComments(str)
    
    var offset
    try {
      while (offset = str.match(/\ntransition /)) {
        // end if no more matches
        if (!offset) break

        // skip past the 'transition ' text
        var str2 = str.substr(offset.index + 11)

        // get method name
        var offset2 = str2.match(/\(/)
        var methodname = str2.substr(0, offset2.index)

        // get parameter string
        var offset3 = str2.match(/\)/)
        var parameterStr = str2.substr(offset2.index+1, offset3.index-offset2.index-1)

        // split parameter string into pairs
        var params = parameterStr.split(',').filter(String)
        var finalParams = []

        params.map(function(param) {
          var name = param.split(':')[0]
          var type = param.split(':')[1]
          finalParams.push({'vname': name.trim(), 'type': type.trim(), 'value': ''})
        })

        list.push({
          methodName: methodname.trim(),
          params: finalParams
        })
        // trim the string past the already matched transition
        str = str2
      }
    } catch (e) {
      console.log('Error in parsing transitions.')
      console.log(e)
      return []
    }

    return list
  }

  parseInitParams(str) {
    var list = []
    str = this.removeComments(str)

    try {
      var offset = str.match(/\ncontract /)
      // skip past the 'contract ' text
      var str2 = str.substr(offset.index + 9)

      // get contract name
      var offset2 = str2.match(/\(/)
      var contractname = str2.substr(0, offset2.index)

      // get parameter string
      var offset3 = str2.match(/\)/)
      var parameterStr = str2.substr(offset2.index+1, offset3.index-offset2.index-1)

      // split parameter string into pairs
      var params = parameterStr.split(',').filter(String)
      var finalParams = []

      params.map(function(param) {
        var name = param.split(':')[0]
        var type = param.split(':')[1]
        list.push({'vname': name.trim(), 'type': type.trim(), 'value': ''})
      })
    } catch (e) {
      console.log('Error in parsing initialization params.')
      console.log(e)
      return []
    }

    return list
  }

  removeComments(str) {
    var originalStr = str
    var commentStart

    try {
      // loop till all comments beginning with '(*' are removed
      while (commentStart = str.match(/\(\*/)) {
        // get the string till comment start
        var str1 = str.substr(0, commentStart.index)

        // get the string after comment start
        var str2 = str.substr(commentStart.index)
        var commentEnd = str2.match(/\*\)/)
        var str3 = str2.substr(commentEnd.index + 2)

        str = str1 + str3
      }
    } catch (e) {
      return originalStr
    }
    return str
  }

  updateTransition(methodName) {
    let i = this.contract.ABI.transitions.findIndex(item => item.methodName === methodName)
    if (i == -1) return
    let newTransition = this.contract.ABI.transitions[i]

    this.contract.methodName = newTransition.methodName
    this.contract.params = newTransition.params.slice()
  }
}
