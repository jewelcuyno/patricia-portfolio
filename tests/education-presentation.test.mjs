import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {educationActivities} from "../lib/education-list.js";

const read=(path)=>readFile(new URL(path,import.meta.url),"utf8");
const [page,css,cv]=await Promise.all([
  read("../app/page.tsx"),
  read("../app/globals.css"),
  read("../lib/cv.ts"),
]);

test("Education Activities and Honors use an ordered semantic bullet rendering path",()=>{
  assert.match(page,/<ul className="education-activities">\{activitiesAndHonors\.map\(\(item,index\)=><li key=\{index\}>\{item\}<\/li>\)\}<\/ul>/);
  assert.deepEqual(educationActivities("Activity 1\nActivity 2","Honor 1"),["Activity 1","Activity 2","Honor 1"]);
});

test("Education bullets have explicit visible marker and wrapped-line styling",()=>{
  assert.match(css,/education-activities\{[^}]*list-style-type:disc!important[^}]*padding-left:1\.2rem/);
  assert.match(css,/education-activities li\{[^}]*display:list-item[^}]*line-height:1\.55/);
});

test("empty Education Activities and Honors render no empty list",()=>{
  assert.deepEqual(educationActivities("","  ",null),[]);
  assert.match(page,/activitiesAndHonors\.length>0&&<ul className="education-activities">/);
});

test("Education dates remain present",()=>{
  assert.match(page,/\(x\.start_label\|\|x\.end_label\)&&<p className="education-dates">/);
});

test("automatic CV Education continues to exclude Activities and Honors",()=>{
  const educationResolver=cv.match(/education:data\.education\.map\([^\n]+/)?.[0]||"";
  assert.doesNotMatch(educationResolver,/activities|honors/);
});
