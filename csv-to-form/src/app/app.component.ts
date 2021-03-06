import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation
}                                                                   from '@angular/core';
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Subject}                                                    from 'rxjs';

const parser = require('csv-parse');

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  public form: FormGroup;
  public inputForm: FormGroup;
  public template: { column: number, label: string }[];
  public showResult: any = null;
  @Input() forcedTemplate: { column: number, label: string }[]
    = null;
  @Output() formDataSaved: EventEmitter<any> = new EventEmitter<any>();
  @Output() formDataUpdated: EventEmitter<any> = new EventEmitter<any>();
  @Output() csvReadEvent: EventEmitter<any> = new EventEmitter<any>();
  public access: string;
  // [
  //   {column: 0, label: 'cpt'},
  //   {column: 1, label: 'moredata'},
  //   {column: 2, label: 'fee'}
  // ];
  public dataTranslationTable: { column: number, hasLabel: string }[] = [];
  public insertText: string = '';

  constructor(private fb: FormBuilder) {
    this.form = new FormGroup({
      'fileUp': new FormControl('')
    });
    this.inputForm = this.fb.group(
      {
        list: this.fb.array([])
      });
    if (this.forcedTemplate) this.template = this.forcedTemplate;
  }

  ngOnDestroy(): void {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
  }

  createInsertQueryText(data: any[]) {
    let result = '';
    let built = false;
    console.log('Creating Insert Query Text');
    console.log(data);
    data.forEach(datum => {
      let kphrase = '';
      let vphrase = '(';
      console.log(datum);
      Object.entries(datum).forEach(([k, v]: [string, string]) => {
        kphrase += "`" + k + "`" + ', ';
        vphrase += "'" + v.replace("'", "''") + "'" + ', ';
      });
      kphrase += "`" + 'access' + "`" + ', ';
      vphrase += "'" + this.access + "'";
      if (!built) {
        result += 'INSERT INTO patients_imported (' + kphrase.slice(0, kphrase.length - 2) + ') VALUES\n';
        built = true;
      }
      result += vphrase + '), \n';
    });
    this.insertText = result;
    this.copyMessage(result);
    console.warn('Inset queries copied to clipboard');
  }

  showChange(filesUploaded: FileList) {
    const source: Subject<any> = new Subject<any>();
    const processRead = (x) => {
      parser(j.result, {comment: '#'}, function (err, output) {
        if (err) console.warn(err);
        source.next(output);
      });
    };

    let f: File = filesUploaded.item(0);

    let j: FileReader = new FileReader();


    source.subscribe((output: any[]) => {
      this.csvReadEvent.emit('Read');
      output = this.cleanOutput(output);
      if (!this.forcedTemplate) this.createTemplate(output[0]);
      this.buildTranslationTable(output);
      output.slice(1, output.length).forEach((row: []) => {
        const control = this.inputForm.controls.list as FormArray;
        control.push(this.initRows(row));
      })
    });

    j.onloadend = processRead;
    j.readAsText(f);
  }

  createTemplate(outputLineZero: string[]) {
    this.template = [];
    outputLineZero.forEach((row: string, index: number) => {
      this.template.push({
        column: index,
        label: row
      })
    });
  }

  getValueViaTranslationTable(columnLabel: string, row: string[]): string {
    let foundCol = this.dataTranslationTable.find((t) => t.hasLabel === columnLabel);
    return foundCol ? row[foundCol.column] : '';
  }

  public submitted($event: Event) {
    this.showResult = this.inputForm.value.list;
    this.formDataSaved.emit(this.inputForm.value.list);
    this.createInsertQueryText(this.inputForm.value.list);
  }

  public formUpdated() {
    this.formDataUpdated.emit(this.inputForm.value.list);
  }

  copyMessage(val: string) {
    let selBox = document.createElement('textarea');
    selBox.style.position = 'fixed';
    selBox.style.left = '0';
    selBox.style.top = '0';
    selBox.style.opacity = '0';
    selBox.value = val;
    document.body.appendChild(selBox);
    selBox.focus();
    selBox.select();
    document.execCommand('copy');
    document.body.removeChild(selBox);
  }

  accessChanged($event: Event) {
    console.log(this.access);
  }

  protected templateGetLabelForSlot(i: number) {
    return this.template.find((t) => t.column === i).label;
  }

  private cleanOutput(output: string[][]): string[][] {
    let ret: string[][] = [];
    output.forEach((row: string[]) => {
      let newRow: string[] = [];
      row.forEach((item: string) => {
        item = item.replace('"', '').trim();
        newRow.push(item);
      });
      ret.push(newRow);
    });
    return ret;
  }

  private initRows(row: string[]): FormGroup {
    const controls: {} = {};
    for (let i = 0; i < this.template.length; i++) {
      controls[this.templateGetLabelForSlot(i)] = [this.getValueViaTranslationTable(this.templateGetLabelForSlot(i), row), Validators.compose([])];
    }
    const cont = this.fb.group(controls);
    return cont;
  }

  private buildTranslationTable(output: any[][]) {
    output[0].forEach((columnTitle, index: number) => {
      this.dataTranslationTable.push({
        column: index,
        hasLabel: columnTitle
      })
    })
  }
}
