const Airtable = require('airtable');

class AirtableWriter {
  constructor(userConfig) {
    this.userConfig_ = userConfig;

    // TODO(gmike): Move this to a config file.
    this.apiKey_ = "key8X1nJ0GN1DVYua";
    Airtable.configure({ apiKey: this.apiKey_ });
  }

  exportArrayOfArrays(arrayOfArrays) {
    const baseId = "appJNgQOTADSIVg1n";
    const tableId = "tbloQgJ2V6P7Rc2xP";

    // https://airtable.com/developers/web/api/create-table
    return this.writeToExistingBase_(baseId, tableId, arrayOfArrays);
  }

  writeToExistingBase_(baseId, tableId, arrayOfArrays) {
    const base = new Airtable({ apiKey: this.apiKey_ }).base(baseId);
    const table = base(tableId);

    return Promise.all(
      arrayOfArrays.map((row, i) => {
        return table.create(row);
      })
    );

    return Promise.all(
      arrayOfArrays.map((row, i) => {
        const obj = {};
        row.forEach((value, j) => {
          obj[`field${j + 1}`] = value;
        });
        return table.create(obj);
      })
    );
  }
}