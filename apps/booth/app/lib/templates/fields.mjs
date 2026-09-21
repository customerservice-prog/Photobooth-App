// Public field definitions. Existing storage keys are retained so saved rentals are not lost.
export const EVENT_LABELS=Object.freeze({wedding:'Wedding',birthday:'Birthday',mitzvah:'Bar / Bat Mitzvah',graduation:'Graduation',corporate:'Corporate',other:'Other celebration'});
const field=(key,label,placeholder='',extra={})=>Object.freeze({key,label,placeholder,...extra});
export const EVENT_FIELDS=Object.freeze({
 wedding:[field('partner1','First partner’s name','Alex',{required:true}),field('partner2','Second partner’s name','Jordan',{required:true}),field('venue','Venue or location (optional)','The Garden House')],
 birthday:[field('honoree','Whose birthday is it?','Taylor',{required:true}),field('age','Age to show (optional)','30',{inputMode:'numeric',maxLength:3}),field('theme','Caption on the print (optional)','A night to remember')],
 mitzvah:[field('honoree','Celebrant’s name','Sam',{required:true}),field('mitzvahType','Celebration','',{options:['Bar Mitzvah','Bat Mitzvah','B’ Mitzvah','Mitzvah Celebration'],defaultValue:'Bar Mitzvah'}),field('hebrewName','Hebrew name (optional)'),field('symbols','Printed motifs','',{options:['Geometric only','Star of David'],defaultValue:'Geometric only'})],
 graduation:[field('graduate','Graduate’s name','Morgan',{required:true}),field('classYear','Class year (optional)','2026',{inputMode:'numeric',maxLength:4}),field('school','School or university (optional)')],
 corporate:[field('company','Company or organization'),field('eventName','Event name','Annual celebration'),field('tagline','Brand tagline (optional)','People. Ideas. Possibility.')],
 other:[field('eventName','What is the event called?','Anniversary celebration',{required:true}),field('honoree','Host, family or guest of honor (optional)','The Carters'),field('subtitle','Caption on the print (optional)','Celebrating together')]
});
export function fieldsForEvent(type){return EVENT_FIELDS[Object.hasOwn(EVENT_FIELDS,type)?type:'other'];}
