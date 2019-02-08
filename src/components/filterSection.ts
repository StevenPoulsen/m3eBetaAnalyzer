import {bindable,autoinject} from 'aurelia-framework';
import {FilterService} from "../services/filterService";
import {ShownService} from "../services/shownService";

@autoinject()
export class FilterSection {
  @bindable()
  private name:string;
  @bindable()
  private filter;
  @bindable
  private count: number;
  private show:boolean = false;

  constructor(private filterService:FilterService, private shownService: ShownService) {}

  bind() {
    this.show = this.shownService.getShown("filterSection", this.name);
  }

  invert() {
    this.modify((item)=>!item);
  }

  all() {
    this.modify(()=>true);
  }

  none() {
    this.modify(()=>false);
  }

  private modify(rule) {
    if (this.filter && this.filterService.filters[this.filter]) {
      for (const key of Object.keys(this.filterService.filters[this.filter])) {
        this.filterService.filters[this.filter][key] = rule(this.filterService.filters[this.filter][key]);
      }
      this.filterService.filterChange();
    } else {
      console.error(name, "No such filter", this.filter, this.filterService.filters);
    }
  }

  toggle() {
    this.show = !this.show;
    this.shownService.setShown("filterSection", this.name, this.show);
  }

}
