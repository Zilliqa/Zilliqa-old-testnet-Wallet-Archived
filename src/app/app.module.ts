// Copyright (c) 2018 Zilliqa 
// This source code is being disclosed to you solely for the purpose of your participation in 
// testing Zilliqa. You may view, compile and run the code for that purpose and pursuant to 
// the protocols and algorithms that are programmed into, and intended by, the code. You may 
// not do anything else with the code without express permission from Zilliqa Research Pte. Ltd., 
// including modifying or publishing the code (or any part of it), and developing or forming 
// another public or private blockchain network. This source code is provided ‘as is’ and no 
// warranties are given as to title or non-infringement, merchantability or fitness for purpose 
// and, to the extent permitted by law, all liability for your use of the code is disclaimed. 


import { BrowserModule } from '@angular/platform-browser';
import { NgModule, ErrorHandler } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import * as Raven from 'raven-js';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { CreateComponent } from './create/create.component';
import { WalletComponent } from './wallet/wallet.component';
import { WalletbaseComponent } from './wallet/walletbase/walletbase.component';
import { WalletsendComponent } from './wallet/walletsend/walletsend.component';
import { WallethistoryComponent } from './wallet/wallethistory/wallethistory.component';
import { MaintenanceComponent } from './error/maintenance.component';
import { Constants } from './constants';
import { ZilliqaService } from './zilliqa.service';
import { AuthGuardService } from './auth-guard.service';
import { NetworkService } from './network.service';
import { AppRoutingModule } from './app-routing.module';

Raven
  .config(Constants.RAVEN_URL)
  .install();

export class RavenErrorHandler implements ErrorHandler {
  handleError(err:any) : void {
    Raven.captureException(err);
  }
}


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    CreateComponent,
    WalletComponent,
    WalletbaseComponent,
    WalletsendComponent,
    WallethistoryComponent,
    MaintenanceComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule
  ],
  providers: [
    ZilliqaService,
    AuthGuardService,
    NetworkService,
    { provide: ErrorHandler, useClass: RavenErrorHandler }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
