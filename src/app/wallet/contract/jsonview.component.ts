import { Component, Input, OnInit } from '@angular/core';

function escapeString(str) {
  return str.replace('"', '\"');
}

// From http://stackoverflow.com/a/332429
function getObjectName(object) {
  if (object === undefined) {
    return '';
  }
  if (object === null) {
    return 'Object';
  }
  if (typeof object === 'object' && !object.constructor) {
    return 'Object';
  }

  //ES6 default gives name to constructor
  if (object.__proto__ !== undefined && object.__proto__.constructor !== undefined && object.__proto__.constructor.name !== undefined) {
    return object.__proto__.constructor.name;
  }

  var funcNameRegex = /function (.{1,})\(/;
  var results = (funcNameRegex).exec((object).constructor.toString());
  if (results && results.length > 1) {
    return results[1];
  } else {
    return '';
  }
}

function getType(object) {
  if (object === null) { return 'null'; }
  return typeof object;
}

function getValuePreview (object, value) {
  var type = getType(object);

  if (type === 'null' || type === 'undefined') { return type; }

  if (type === 'string') {
    value = '"' + escapeString(value) + '"';
  }
  if (type === 'function'){
    // Remove content of the function
    return object.toString()
      .replace(/[\r\n]/g, '')
      .replace(/\{.*\}/, '') + '{…}';
  }
  return value;
}

function getPreview(object) {
  var value = '';
  if (typeof object === 'object') {
    value = getObjectName(object);
    if (Array.isArray(object)) {
      value += '[' + object.length + ']';
    }
  } else {
    value = getValuePreview(object, object);
  }
  return value;
}

const JSONFormatterConfig = {
  hoverPreviewEnabled: false,
  hoverPreviewArrayCount: 100,
  hoverPreviewFieldCount: 5
};

@Component({
  selector: 'json-formatter',
  template: `
  <div class="json-formatter-row">
    <a (click)="toggleOpen()">
    <span class="toggler" [class.open]="isOpen" *ngIf="isObject"></span>
    <span class="key" *ngIf="hasKey"><span class="key-text">{{key}}</span><span class="colon">:</span></span>
    <span class="value">
    <span *ngIf="isObject">
      <span class="constructor-name">{{ constructorName }}</span>
      <span *ngIf="isArray"><span class="bracket">[</span><span class="number">{{json.length}}</span><span
      class="bracket">]</span></span>
    </span>
    <span *ngIf="!isObject" (click)="openLink(isUrl)" class="{{type}}"
        [ngClass]="{date: isDate, url: isUrl}">{{parseValue(json)}}</span>
    </span>
    <span *ngIf="showThumbnail()" class="thumbnail-text">
    {{getThumbnail()}}
    </span>
    </a>
    <div class="children" *ngIf="keys?.length && isOpen">
    <json-formatter *ngFor="let key of keys; trackBy: trackByFn" [json]="json[key]" [key]="key"
            [open]="childrenOpen()"></json-formatter>
    </div>
    <div class="children empty object" *ngIf="isEmptyObject()"></div>
    <div class="children empty array" *ngIf="!keys?.length && isOpen && isArray"></div>
  </div>
  `,
  styleUrls: ['./jsonview.component.css']
})
export class Jsonview implements OnInit {
  @Input() json: any;
  @Input() key;
  @Input() open: number;

  isArray;
  isObject;
  isUrl;
  isDate;
  type;

  hasKey;
  keys: any;
  isOpen: boolean;
  constructorName: string;

  ngOnInit() {
    this.isArray = Array.isArray(this.json);
    this.isObject = this.json != null && typeof this.json === 'object';
    this.type = getType(this.json);
    this.hasKey = typeof this.key !== 'undefined';
    this.isOpen = this.open && this.open > 0

    this.constructorName = getObjectName(this.json);
    if (this.isObject) {
      this.keys = Object.keys(this.json).map((key) => key === '' ? '""' : key);
    }
    if (this.type === 'string') {
      if ((new Date(this.json)).toString() !== 'Invalid Date') {
        this.isDate = true;
      }
      if (this.json.indexOf('http') === 0) {
        this.isUrl = true;
      }
    }
  }

  isEmptyObject() {
    return this.keys && !this.keys.length && this.isOpen && !this.isArray;
  }

  toggleOpen() {
    this.isOpen = !this.isOpen;
  }

  childrenOpen() {
    return this.open > 1 ? this.open - 1 : 0;
  }

  openLink(isUrl) {
    if (isUrl) {
      window.location.href = this.json;
    }
  }

  parseValue(value) {
    return getValuePreview(this.json, value);
  }

  showThumbnail() {
    return this.isObject && !this.isOpen;
  }

  getThumbnail() {
    if (this.isArray) {
      // if array length is greater then 100 it shows "Array[101]"
      if (this.json.length > JSONFormatterConfig.hoverPreviewArrayCount) {
      return 'Array[' + this.json.length + ']';
      } else {
      return '[' + this.json.map(getPreview).join(', ') + ']';
      }
    } else {
      // the first five keys (like Chrome Developer Tool)
      const narrowKeys = this.keys.slice(0, JSONFormatterConfig.hoverPreviewFieldCount);
      // json value schematic information
      const kvs = narrowKeys.map(key => key + ':' + getPreview(this.json[key]));

      // if keys count greater then 5 then show ellipsis
      const ellipsis = this.keys.length >= 5 ? '…' : '';

      return '{' + kvs.join(', ') + ellipsis + '}';
    }
  }

  trackByFn(i) {
    return i;
  }
}
