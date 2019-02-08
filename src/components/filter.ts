import {FilterService} from "../services/filterService";
import {DataService} from "../services/dataService";
import {autoinject} from 'aurelia-framework';

@autoinject()
export class Filter {

  constructor(private filterService: FilterService, private dataService: DataService) {
  }


}
