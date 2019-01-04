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


import { Component, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

import { ZilliqaService } from '../../zilliqa.service';
import { NetworkService } from '../../network.service';
import { Jsonview } from './jsonview.component';
import { Constants } from '../../constants';
import * as $ from 'jquery';

declare var ace:any

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

  @ViewChild('editor0') editor
  codeError: {
    line: any,
    text: string
  }

  constructor(private router: Router, public zilliqaService: ZilliqaService, private networkService: NetworkService) {    
    this.sampleContract = 0
    this.state = 1
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
      gas: 50,
      params:
      [],
      result: '',
      state: {},
      code: {},
      ABI: {
        transitions: [],
        initParams: {}
      }
    }
    this.pendingMethodCalls = []
    this.codeError = {
      line: null,
      text: null
    }
    this.codeText = Constants.SAMPLE_SCILLA_CODES[0]
  }

  loadData() {
    let that = this
    this.zilliqaService.getContractHistory().then((data) => {
      if (data.result && data.result.Error) {

      } else {
        that.contractHistory = data.result
      }
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
    this.clearEditor()

    // optional arg
    if (contractAddr) {
      let that = this
      this.contract.contractAddr = contractAddr

      this.refreshContract()
    }
    if (newState == 2) {
      this.contract.gas = 50
    } else if (newState == 3) {
      this.contract.gas = 10
    } 

    this.state = newState
  }

  runCode() {
    let that = this
    
    console.log(`Running Contract Creation...`)
    this.zilliqaService.networkLoading = true // start loading till it's deployed
    this.zilliqaService.createContract(this.codeText, this.contract.ABI.initParams, this.contract.amount, this.contract.gas).then((data) => {
      that.newContractCreated(data.result, data.addr)
    }).catch((err) => {

    })
  }

  clearEditor() {
    this.editor.getEditor().getSession().clearAnnotations()
    this.editor.getEditor().getSession().removeMarker(this.codeError.line)

    this.codeError = {
      line: null,
      text: null
    }
  }

  checkCode() {
    let that = this

    this.clearEditor()
    this.contract.ABI.initParams = that.parseInitParams(this.codeText)

    this.zilliqaService.checkContractCode(this.codeText).then((data) => {
      if (data.result.result == 'success') {
        that.codeError.text = 'Code parsing was successful.'
      } else if (data.result.result == 'error') {
        let text = data.result.message

        // split error message('line x, position y') first by comma, then trim and split by space
        let line = text.split(',')[0].trim().split(' ')[1]
        let col = text.split(',')[1].trim().split(' ')[1]
        line = parseInt(line) - 1
        col = parseInt(col)

        // set editor highlight and annotation
        var Range = ace.require('ace/range').Range
        that.codeError.line = that.editor.getEditor().getSession().addMarker(new Range(line, 0, line, col), 'ace_highlight-marker', 'fullLine')
        
        let ed = that.editor.getEditor()
        that.codeError.text = 'Syntax Error: line ' + (parseInt(line)+1) + ', column ' + col
        ed.getSession().setAnnotations([{
          row: line,
          column: col,
          text: that.codeError.text,
          type: 'error'
        }])
        
        ed.renderer.scrollCursorIntoView({row: line, column: col}, 0.5)
        ed.gotoLine(line+1, col, true)
        ed.focus()
      }
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
        that.zilliqaService.networkLoading = false

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

  invalidGas() {
    // true if blank or negative or higher than wallet balance - 0 is allowed
    return (this.contract.gas == null) || (this.contract.gas < 0) || (this.contract.gas > this.zilliqaService.userWallet.balance)
  }

  invalidAmount() {
    // true if blank or negative or higher than wallet balance - 0 is allowed
    return (this.contract.amount == null) || (this.contract.amount < 0) || (this.contract.amount > this.zilliqaService.userWallet.balance)
  }

  checkBalance() {
    // true if balance < 50
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
    var gas = this.contract.gas

    let that = this

    this.zilliqaService.callTxnMethod(contractAddr, method, amount, gas, params).then((data) => {
      that.contract.result = that.contract.methodName + " call pending (approx. wait time ~1 min), txnid: " + data.result
      that.pendingMethodCalls.push({callName: that.contract.methodName, txnid: data.result, count: 0})
    })
  }

  checkPendingMethodCalls() {
    let that = this
    for(var i = 0; i < this.pendingMethodCalls.length; i++) {
      console.log(`Checking pending method call (approx. wait time ~1 min): ` + this.pendingMethodCalls[i].callName)

      // increment counter of number of times called, remove when it reaches 1000
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

        // refresh state
        that.refreshContractState()
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
    this.contract.state.result = null                                                                             
    this.zilliqaService.getContractState(contractAddr).then((data) => {
      that.contract.state.error = null
      that.contract.state.result = data.result
    }).catch((err) => {
      that.contract.state.error = "Contract state call failed: " + JSON.stringify(err)
    })
  }

  refreshContractCode() {
    var contractAddr = this.contract['contractAddr']

    let that = this
    this.zilliqaService.getContractCode(contractAddr).then((data) => {
      that.contract.code.error = null
      that.contract.code.result = data.result.code
      that.codeText = that.contract.code.result

      // parse the code to get the selectedTransitions
      that.contract.ABI.transitions = that.parseTransitions(that.contract.code.result)
      that.contract.ABI.initParams = that.parseInitParams(that.contract.code.result)
    }).catch((err) => {
      that.contract.code.error = "Contract code call failed: " + JSON.stringify(err)
      that.codeText = that.contract.code.error
      that.contract.code.result = null
      that.contract.ABI = {transitions: [], initParams: {}}
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
    let that = this

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
        var val = ''

        if (name.trim() == 'owner' && type.trim() == 'Address') {
          val = '0x' + that.zilliqaService.userWallet.address.toLowerCase()
        }
        list.push({'vname': name.trim(), 'type': type.trim(), 'value': val})
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

  copyToClipboard() {
    // create temp element
    var copyElement = document.createElement("pre")
    var text = JSON.stringify(this.contract.state.result, null, 2)
    copyElement.appendChild(document.createTextNode(text))
    copyElement.id = 'tempCopyToClipboard'
    document.body.appendChild(copyElement)

    // select the text
    var range = document.createRange()
    range.selectNode(copyElement)
    window.getSelection().removeAllRanges()
    window.getSelection().addRange(range)

    // copy & cleanup
    document.execCommand('copy')
    window.getSelection().removeAllRanges()
    copyElement.remove()
  }
}
