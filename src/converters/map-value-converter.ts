import {DataService} from "../services/dataService";

export class MapValueConverter {

  toView(obj) {
    return DataService.getObjectAsMap(obj);
  }
}
