export class BlobToUrlValueConverter{
  toView(obj) {
    return URL.createObjectURL(obj);
  }
}
