export class KeysValueConverter {
  toView(obj) {
    obj = obj || {};
    return Reflect.ownKeys(obj);
  }
}
