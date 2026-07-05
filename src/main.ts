/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import "zone.js";
import "@angular/compiler";
import { bootstrapApplication } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";

bootstrapApplication(AppComponent).catch((err) => console.error(err));
