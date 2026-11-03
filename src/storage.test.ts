import { describe,it,expect,vi } from 'vitest';
import { empty,validSaved,load,save,type Saved } from './storage';
import { generateQuestions } from './math';
const fixture=():Saved=>({...empty(),session:{id:'test',level:'star',mode:'keypad',questions:generateQuestions('star',18),records:[],index:0,attempts:[999],hintUsed:false,resolved:false,input:''}});
describe('local progress',()=>{
 it('preserves legitimate wrong answers up to three digits',()=>{const v=fixture();expect(validSaved(v)).toBe(true);v.session!.records=[{question:v.session!.questions[0],attempts:[999,998],hintUsed:false}];v.session!.index=1;expect(validSaved(v)).toBe(true);});
 it('rejects corrupt structure and invalid arithmetic',()=>{expect(validSaved({version:1,session:{}} as Saved)).toBe(false);const v=fixture();v.session!.questions[0].answer=999;expect(validSaved(v)).toBe(false);});
 it('rejects mismatched progress and question records',()=>{const v=fixture();v.session!.index=1;expect(validSaved(v)).toBe(false);});
 it('recovers from invalid JSON and inaccessible storage',()=>{vi.stubGlobal('localStorage',{getItem:()=>'{',setItem:()=>{throw Error('blocked');}});expect(load()).toEqual(empty());expect(save(empty())).toBe(false);vi.unstubAllGlobals();});
});
