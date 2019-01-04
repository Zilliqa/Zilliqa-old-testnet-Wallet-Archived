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
import {CanActivate, Router, RouterStateSnapshot, ActivatedRouteSnapshot} from '@angular/router';

import { ZilliqaService } from './zilliqa.service';

@Injectable()
export class AuthGuardService implements CanActivate {

  constructor(private router: Router, private zilliqaService: ZilliqaService) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // check if user wallet is present
    const isLoggedIn = (this.zilliqaService.getWallet().address != undefined)

    if (isLoggedIn) {
      return true;
    } else {
      this.router.navigate(['/home']);
      return false;
    }
  }
}
