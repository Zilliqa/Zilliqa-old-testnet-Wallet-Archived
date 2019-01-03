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
import { ContractComponent } from './wallet/contract/contract.component';
import { Jsonview } from './wallet/contract/jsonview.component';
import { MaintenanceComponent } from './error/maintenance.component';
import { ErrorComponent } from './error/error.component';
import { Constants } from './constants';
import { ZilliqaService } from './zilliqa.service';
import { AuthGuardService } from './auth-guard.service';
import { NetworkService } from './network.service';
import { AppRoutingModule } from './app-routing.module';
import { AceEditorModule } from 'ng2-ace-editor';


@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    CreateComponent,
    WalletComponent,
    WalletbaseComponent,
    WalletsendComponent,
    WallethistoryComponent,
    ContractComponent,
    Jsonview,
    MaintenanceComponent,
    ErrorComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    AppRoutingModule,
    HttpClientModule,
    AceEditorModule
  ],
  providers: [
    ZilliqaService,
    AuthGuardService,
    NetworkService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
