import {FilterService} from "../services/filterService";
import {autoinject} from 'aurelia-framework';

@autoinject()
export class Sort {

  constructor(private filterService:FilterService){}

  filterChange() {
    this.filterService.filterChange();
  }
}
