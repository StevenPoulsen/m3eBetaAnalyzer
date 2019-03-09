export class SuitValueConverter {
  private type;
  private markers:any[] = [
    {marker:"b", img:"blast"},
    {marker:"F", img:"bonus"},
    {marker:"a", img:"aura"},
    {marker:"z", img:"gun"},
    {marker:"y", img:"melee"},
    {marker:"p", img:"pulse"},
    {marker:"\\-", img:"minus"},
    {marker:"\\+", img:"plus"},
    {marker:"M", img:"mask"},
    {marker:"C", img:"crow"},
    {marker:"T", img:"tomes"},
    {marker:"R", img:"ram" }
  ];

  toView(obj,type) {
    this.type = type || 'screen';
    if (typeof obj !== "string") {
      return "";
    }
    if (obj === "-") {
      return obj;
    }

    if (obj.match(/^[0-9]{1,2}[MCTR]{1,3}$/i))  {
      return this.statReplace(obj);
    }

    for (const marker of this.markers) {
      obj = this.replace(obj, marker.marker, marker.img);
    }
    return obj;
  }

  private replace(string, marker, img) {
    let result = string;
    let runs = 1;
    if (marker.match(/[+\-b]/)) {
      const matches = string.match(/[+\-b]+/g);
      if (!matches) {
        return result;
      }
      runs = matches.length;
    }

    while (runs > 0) {
      result = result.replace(
        new RegExp("(.*(^| ))(\\()?("+(marker.match(/[+\-]/)?"":"\\+")+")?([0-9]{0,2})("+marker+"+)("+(!marker.match(/[+\-]/)?"[0-9]{1,2}\"?":"")+")"+(marker==='a'?'':'?')+"(\\))?(( |$|\\.|,).*)","ig"),
        (match,p1,p2,p3,p4,p5,p6,p7,p8,p9,p10,offset,string)=>{
          if (p6 === "mm") {
            return string;
          }
          return p1+(p3?p3:'')+(p4?p4:'')+(p5?p5:'')+this.suit(img).repeat(p6.length)+(p7?p7:'')+(p8?p8:'')+p9;
        }
      );

      if (marker === "b") {
        result = result.replace(/([0-9]{1,2}b?)(b)([ \/<])/ig,"$1"+this.suit(img)+"$3");
      }
      runs--;
    }

    result = result.replace(new RegExp("(non-)"+marker+"([ \".,!?]|$)","gi"),"$1"+this.suit(img)+"$2");

    return result;
  }

  private statReplace(string) {
    let result = "";
    for (let i = 0, len = string.length, char; i < len; i++) {
      char = string[i].toUpperCase();
      for (const marker of this.markers) {
        if (marker.marker.toUpperCase() === char) {
          char = this.suit(marker.img);
          break;
        }
      }
      result += char;
    }
    return result;
  }

  private suit(img):string {
    if (this.type === "print") {
      return '<img class="printSuit" src="/images/' + img + '.png" />';
    }
    return '<span class="'+img+' suitImg"></span>';
  }

}
