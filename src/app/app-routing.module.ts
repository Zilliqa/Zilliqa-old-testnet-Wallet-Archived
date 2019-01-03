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


import { NgModule }             from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent }      from './home/home.component';
import { CreateComponent } from './create/create.component';
import { WalletComponent }      from './wallet/wallet.component';
import { WalletbaseComponent }      from './wallet/walletbase/walletbase.component';
import { WalletsendComponent }      from './wallet/walletsend/walletsend.component';
import { WallethistoryComponent }      from './wallet/wallethistory/wallethistory.component';
import { ContractComponent }      from './wallet/contract/contract.component';
import { ErrorComponent }      from './error/error.component';
import { MaintenanceComponent }      from './error/maintenance.component';
import { AuthGuardService }      from './auth-guard.service';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { path: 'create', component: CreateComponent },
  { path: 'wallet', component: WalletComponent, canActivate: [AuthGuardService],
    children: [
      { path: '', redirectTo: 'base', pathMatch: 'full' },
      { path: 'base', component: WalletbaseComponent },
      { path: 'send', component: WalletsendComponent }
      // { path: 'contract', component: ContractComponent },
      // { path: 'history', component: WallethistoryComponent }
    ]
  },
  { path: 'maintenance', component: MaintenanceComponent },
  { path: '404', component: ErrorComponent },
  { path: '**', redirectTo: '/404' }
];

@NgModule({
  imports: [ RouterModule.forRoot(routes) ],
  exports: [ RouterModule ]
})
export class AppRoutingModule {}
