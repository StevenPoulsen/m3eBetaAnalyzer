export class DateValueConverter {
  toView(obj) {
    const date = new Date(+obj);
    if (date) {
      return date.toLocaleDateString('en-UK', {weekday:'long',year:'numeric',month:'short', day: 'numeric'});
    }
    return "";
  }
}
