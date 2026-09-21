export type EventType='wedding'|'birthday'|'mitzvah'|'graduation'|'corporate'|'other';
export type TemplateId='wedding_rosewater'|'wedding_editorial'|'wedding_blacktie'|'birthday_balloon'|'birthday_retro'|'birthday_disco'|'mitzvah_timeless'|'mitzvah_modern'|'mitzvah_mosaic'|'graduation_honors'|'graduation_confetti'|'graduation_future'|'corporate_executive'|'corporate_gala'|'corporate_summit'|'other_blooms'|'other_soiree'|'other_confetti';
export type LegacyTemplateId='ivory'|'blush'|'champagne';
export interface EventConfig{type:EventType;title?:string;subtitle?:string;date?:string;photoFit?:'fit'|'fill';details?:Record<string,string>;defaultTemplate?:LegacyTemplateId;defaultTemplateId?:TemplateId;setupComplete?:boolean;}
export interface TemplateField{key:string;label:string;placeholder:string;required?:boolean;options?:string[];defaultValue?:string;inputMode?:'numeric';maxLength?:number;}
export interface PhotoFrame{shape:'rect'|'round'|'arch'|'cutout';x:number;y:number;width:number;height:number;radius?:number;}
export interface RenderInput{photo?:string;cfg?:EventConfig;template?:TemplateId|LegacyTemplateId;filter?:string;monogram?:string;id?:string;}
export interface BoothTemplate{id:TemplateId;legacyId:LegacyTemplateId;eventType:EventType;name:string;description:string;layout:string;paper:string;ink:string;accent:string;photo:PhotoFrame;fields:ReadonlyArray<TemplateField>;typography:{heading:string;name:string;body:string};render(input:RenderInput):string;}
