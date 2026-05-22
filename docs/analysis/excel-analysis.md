# Excel Workbook Analysis: `C&D Calculator V1.06.xlsm`

## Executive summary

`C&D Calculator V1.06.xlsm` is a clearance-and-delivery quoting workbook for multiple destination countries. The workbook is mostly a rule-based pricing model built from hidden reference sheets, customer lookup tables, and country-specific pricing sheets, with a single visible `Input` sheet acting as the quote output surface.

The workbook is a good candidate for a web rebuild with a TypeScript calculation engine in a Next.js application. The formulas are relatively straightforward, there are no detected volatile functions or advanced dynamic-array constructs, and the only VBA present is an email/screenshot helper macro rather than core business logic.

## Analysis method

- Pulled latest from `origin/main` before analysis.
- Inspected workbook structure with `openpyxl` using `data_only=False` and `keep_vba=True`.
- Inspected all visible and hidden sheets.
- Extracted named ranges, formulas, workbook table objects, sheet visibility, VBA modules, and workbook metadata.
- Checked for:
  - hidden sheets
  - named ranges
  - formula patterns
  - volatile/complex functions
  - VBA macros
  - data validation
  - conditional formatting
  - external links

## High-level workbook structure

- Workbook sheets: 9
- Visible sheets: 1
- Hidden sheets: 8
- Total formula cells detected: 113
- Total non-formula constant cells detected: 90,845
- External links detected: none
- Data validation rules detected: none
- Conditional formatting rules detected: none
- Excel tables detected: 1 (`Qatari_Riyal_Exchange_Rates_Table_Converter`)
- VBA present: yes, but limited and non-calculation-critical

## Workbook flow

At a high level, the workbook behaves like this:

1. The user chooses or enters quote context on hidden `Calculator` cells:
   - user
   - customer
   - country
   - shipping method
   - trader currency
2. The visible `Input` sheet pulls:
   - recipient email
   - country
   - destination notes
   - duty amount
   - clearance/delivery amount
   - display currency
3. Country-specific hidden sheets compute pricing based on:
   - invoice value
   - chargeable weight
   - selected transport method
   - selected customer
   - static fee tables
   - country/customer lookup data
4. A VBA button on `Input` turns the visible quote area into an image and emails it through Outlook.

This makes the workbook effectively a single quote-generation flow with country-specific pricing engines behind the scenes.

## Sheet inventory

### 1. `Input`

| Property | Value |
|---|---|
| State | visible |
| Dimensions | `A1:K26` |
| Approx role | quote summary / presentation layer |
| Inputs present | yes |
| Calculations present | yes |
| Outputs present | yes |

#### Purpose

This is the only visible worksheet and acts as the quote presentation sheet. It displays the selected user, job number, customer, country, shipping method, chargeable weight, invoice value, duty, final C+D amount, and destination notes.

#### Key cells and roles

- `A1`: recipient email via `VLOOKUP(Calculator!I6, EMAILS, 2, FALSE)`
- `A2`: selected user via `=Calculator!I6`
- `C6`: job number constant in current workbook sample
- `C8`: selected country via `=Calculator!I8`
- `C10`: chargeable weight constant in current sample
- `C11`: invoice value constant in current sample
- `C13`: duty output chosen by country
- `C14`: clearance/delivery output chosen by country
- `D14`: output currency label chosen by country
- `F5`: destination notes chosen by country

#### Formula patterns and logic

- `=VLOOKUP(Calculator!I6,EMAILS,2,FALSE)`
  - maps selected user to email address.
- `=Calculator!I6`
  - pulls selected user.
- `=Calculator!I8`
  - pulls selected country from hidden calculator.
- `=IF(country="SOUTH AFRICA", ..., IF(country="SINGAPORE", ..., ...))`
  - repeated dispatch pattern that routes duty, notes, cost, and currency to the correct country sheet.
- `=D14`
  - currency cell reuse for invoice and duty display.

#### Observations

- This is a presentation layer, not the true input engine.
- It depends heavily on hidden `Calculator` control cells.
- Country routing is hardcoded with nested `IF` statements.

### 2. `Users`

| Property | Value |
|---|---|
| State | hidden |
| Dimensions | `A1:C91` |
| Approx role | lookup table |
| Inputs present | no |
| Calculations present | no |
| Outputs present | indirectly |

#### Purpose

Lookup table of users, their email addresses, and preferred currency.

#### Structure

- Column A: trader/user name
- Column B: email
- Column C: currency

#### Usage

Supports named ranges:

- `EMAILS` → `Users!$A$2:$B$85`
- `QATARUSER` → `Users!$A$2:$C$85`
- `Users` → `Users!$A$2:$A$85`

#### Notes

- No formulas.
- This should become a reference dataset in the web app.

### 3. `Calculator`

| Property | Value |
|---|---|
| State | hidden |
| Dimensions | `A1:I1080` |
| Approx role | central selector + master customer table |
| Inputs present | yes |
| Calculations present | limited |
| Outputs present | yes |

#### Purpose

Acts as the hidden driver sheet. It combines a master customer-country table with a small set of control cells used by the `Input` sheet and country sheets.

#### Main table

Columns near the top:

- A: Customer
- B: Country
- C: Delivery/Zone
- D: Rate/KG
- E: Surcharge

This table runs down to row 1080 and is reused for multiple countries.

#### Control cells

- `F7:F9`: shipping method list
  - `AIR`
  - `SEA`
  - `COURIER`
- `F12:F14`: trader currency list
  - `GBP`
  - `EUR`
  - `USD`
- `I6`: selected user
- `I7`: selected customer
- `I8`: selected country via `VLOOKUP(I7,CustomerListSA,2,FALSE)`
- `I9`: selected shipping method

#### Formula patterns and logic

- `I8 = VLOOKUP(I7,CustomerListSA,2,FALSE)`
  - derives country from chosen customer.

#### Named ranges

- `currlist` → `Calculator!$F$12:$F$14`
- `CustomerList` → `Calculator!$A$4:$A$1080`
- `CustomerListSA` → `Calculator!$A$1:$E$1080`
- `DataList` → `Calculator!$A$3:$B$1080`
- `Shipping` → `Calculator!$F$7:$F$9`

#### Notes

- This sheet is the closest thing to the workbook’s domain model root.
- In the web rebuild, this should become:
  - customer master data
  - selection state
  - customer-to-country mapping
  - optional delivery zone/rate metadata

### 4. `South Africa`

| Property | Value |
|---|---|
| State | hidden |
| Dimensions | `A1:T206` |
| Approx role | country pricing engine |
| Inputs present | yes |
| Calculations present | yes |
| Outputs present | yes |

#### Purpose

Country-specific pricing engine for South Africa, covering air, sea, and courier.

#### Core inputs

- transport method from `Calculator!I9`
- chargeable weight from `Input!C10`
- invoice value from `Input!C11`
- customer-specific cartage pricing from `CustomerListSA`

#### Key formula areas

- Air pricing:
  - `B6 = SUM(Input!C10 * C6)` airline handling by weight
  - `B20:D20 = VLOOKUP(Calculator!I7, CustomerListSA, 3..5, FALSE)` customer-specific cartage values
  - `B21 = IF(B20 > C20 * Input!C10, B20, C20 * Input!C10)` minimum-vs-weight cartage logic
  - `B9 = SUM(B21 + D20)` cartage
  - `B10 = IF(B9=220,0,SUM(B9*B23))` fuel surcharge
  - `B13 = SUM(B4:B10)` total C+D base
  - `B14 = SUM(B13*B22)+B18` agency
  - `B15 = SUM(B13+B18+B14)` total air cost
- Sea pricing:
  - flat charges in rows 27–32
  - `B33 = SUM(B27:B32)`
- Courier pricing:
  - rows 37–41 plus `B42 = SUM(B37:B41)`
- Quote output:
  - `H26 = IF(B1="AIR",B15,IF(B1="SEA",B33,IF(B1="COURIER",B42,"")))`

#### Notes

- This is a clean rules engine with static charges plus customer-specific cartage inputs.
- Likely straightforward to port directly to TypeScript.

### 5. `Singapore`

| Property | Value |
|---|---|
| State | hidden |
| Dimensions | `A1:K31` |
| Approx role | country pricing engine |
| Inputs present | yes |
| Calculations present | yes |
| Outputs present | yes |

#### Purpose

Country-specific pricing for Singapore, covering air and sea, with courier explicitly not offered as a normal modeled service.

#### Key formula areas

- Transport method in `B1`
- Air pricing:
  - `B12 = IF(B3 > C3*Input!C10, B3, C3*Input!C10)` terminal charge
  - `B13 = IF(B4 > C4*Input!C10, B4, C4*Input!C10)` agency charge
  - `B14 = SUM(B8:B13)` total air
- Sea pricing:
  - `B30 = SUM(B19+B20+B28+B29+B22+B23+B24+B25+B26+B27) & "+59 SGD per CBM"`
- Final output:
  - `I31 = IF(B1="AIR",B14,IF(B1="COURIER",B16,IF(B1="SEA",B30,"")))`

#### Notes

- Sea output is partially numeric and partially string-formatted (`"+59 SGD per CBM"`).
- That is important for the web rebuild because output type is not purely numeric.

### 6. `Australia`

| Property | Value |
|---|---|
| State | hidden |
| Dimensions | `A1:AB74` |
| Approx role | most complex country pricing engine |
| Inputs present | yes |
| Calculations present | yes |
| Outputs present | yes |

#### Purpose

Australia is the most sophisticated sheet. It includes courier, air, and sea pricing, government charges, delivery service rate tables, zone maps, and multiple decision branches to choose between delivery service options.

#### Core inputs

- transport method from `Calculator!I9`
- invoice value from `Input!C11`
- chargeable weight from `Input!C10`
- selected customer from `Calculator!I7`
- customer delivery zone via `VLOOKUP(Calculator!I7, CustomerListSA, 3, TRUE)`
- delivery service rate tables and zone maps embedded in the sheet

#### Main pricing sections

- Duty/GST:
  - `B3 = SUM(Input!C11*B2)` duty
  - `E4 = SUM(Input!C11*B4)` GST
  - `I4 = SUM(E4+B11+B3)` disbursement figure
- Courier:
  - `B11` government charge by invoice brackets
  - `B12 = D10` disbursement fee
  - `B13 = IF(B1="Courier",Q31,"Not Picked")` local delivery
  - `B14 = SUM(B11:B13)`
- Air:
  - `Q18 = Input!C10`
  - `Q19 = IF(Q18<5,HLOOKUP(R7,AUSTNTRATES,5,FALSE),HLOOKUP(R7,AUSTNTRATES,6,FALSE))`
  - `Q20 = HLOOKUP(R7,AUSTNTRATES,7,FALSE)`
  - `Q21 = IF(Q18>5,U18*Q20+Q19,Q19)`
  - `Q22 = SUM(Q21*V25)` fuel
  - `Q23 = SUM(Q21:Q22)` total S76
  - `Q25 = HLOOKUP(R7,TNTRATES,2,FALSE)`
  - `Q26 = HLOOKUP(R7,TNTRATES,3,FALSE)`
  - `Q27 = IF(Q24>20,U24*Q26+Q25,Q25)`
  - `Q28 = SUM(Q27*V25)`
  - `Q29 = SUM(Q27+Q28)` total T76
  - `Q31 = IF(Q23>Q29,Q29,Q23)` choose cheaper service
  - `B37 = SUM(B25:B36)` total air
- Sea:
  - rows 41–50 compute sea clearance and local delivery
  - `W48 = VLOOKUP(Calculator!I7,AUSNAVIAZONES,2,FALSE)` customer zone
  - `W49 = VLOOKUP(Calculator!I7,AUSNAVIAZONES,4,FALSE)` Navia zone
  - `W50 = INDEX(TNTZONES, MATCH(W48,T35:T45,0), MATCH(W49,T34:Y34,0))` TNT zone lookup
  - rows 53–71 compute S76 vs T76 service totals
  - `W71 = IF(W61>W69,W69,W61)` choose cheaper sea delivery service
  - `B50 = IF(B1="SEA",W71,"Not Picked")`
  - `B51 = SUM(B41:B50)` total sea
- Final output:
  - `J30 = IF(B1="COURIER",B14,IF(B1="AIR",B37,IF(B1="SEA",B51,"")))`
  - `J29 = B3` duty output

#### Complex functions

Only Australia contains the workbook’s notable complex formula pattern:

- `INDEX/MATCH/MATCH` for zone matrix lookup:
  - `=INDEX(TNTZONES,MATCH(W48,T35:T45,0),MATCH(W49,T34:Y34,0))`

#### Named ranges used heavily

- `AUSTNTRATES`
- `S76RATES`
- `TNTRATES`
- `TNTZONES`
- `AUSNAVIAZONES`

#### Notes

- Australia should be treated as the highest-risk part of the port.
- It includes embedded lookup tables, derived service selection, and mixed transport logic.

### 7. `Saudi Arabia`

| Property | Value |
|---|---|
| State | hidden |
| Dimensions | `A1:U17462` |
| Approx role | country pricing engine + HS code duty table |
| Inputs present | yes |
| Calculations present | yes |
| Outputs present | yes |

#### Purpose

This sheet combines simple pricing rules with a very large HS code duty dataset.

#### Pricing logic

- `B6 = IF(Input!C11*B13<=B11,B11,IF(Input!C11*B13>B12,B12,Input!C11*B13))`
  - merchandise process fee bounded by min and max.
- `B8 = SUM(Input!C11*B3)`
  - duty.
- `B9 = SUM(B6:B7)`
  - total courier cost.
- `J26 = B8`
  - duty output.
- `J27 = IF(B1="COURIER",B9,IF(B1="AIR",B15,IF(B1="SEA",B16,"")))`
  - quote output.

#### Important data region

- Named range `SAHSCODE` → `'Saudi Arabia'!$Q:$U`
- Columns `Q:U` contain a large HS code data block with tariff identifiers and date-related fields.

#### Notes

- Air and sea are placeholders (`"To Follow"`), so modeled pricing is only substantive for courier at present.
- The large HS code table likely exists as a manual reference rather than being directly consumed by formulas in this workbook version.
- In the web app, this should likely become a searchable duty-reference dataset rather than a giant worksheet replica.

### 8. `Qatar`

| Property | Value |
|---|---|
| State | hidden |
| Dimensions | `A1:K37` |
| Approx role | country pricing engine |
| Inputs present | yes |
| Calculations present | yes |
| Outputs present | yes |

#### Purpose

Country-specific pricing for Qatar, primarily courier-based, with legalisation fees driven by invoice-value brackets and exchange-rate conversion.

#### Key logic

- `B5 = IF(Input!C11*B14>B13,B13,IF(Input!C11*B14<B12,B12,Input!C11*B14))`
  - merchandise process fee with min/max.
- `B7 = SUM(Input!C11*B3)`
  - duty.
- `C34 = VLOOKUP(Calculator!I6,QATARUSER,3,0)`
  - trader currency.
- `B35 = VLOOKUP(C34,xrates,3,0)`
  - exchange rate from workbook table.
- `B36 = SUM(B34*B35)`
  - invoice converted to QAR.
- `B37 = IF(B36<15000,E28,IF(B36<100000,E29,IF(B36<250000,E30,IF(B36<1000000,E31,IF(B36*0.6%>1000000,B36*0.6%,B36*0.6%)))))`
  - legalisation fee bracket logic.
- `B8 = SUM(B37/B35)`
  - fee converted back.
- `B9 = SUM(B5+B6+B8)`
  - total courier cost.
- `B19 = IF(C1="COURIER",B9,IF(C1="AIR",B16,IF(C1="SEA",B17,)))`
  - quote output.
- `B20 = B7`
  - duty output.

#### Notes

- Uses the workbook table-backed `xrates` name, not a simple range.
- Has both currency conversion and tiered legalisation charges, so this country needs careful porting and test coverage.

### 9. `Qatari Riyal Exchange Rates Tab`

| Property | Value |
|---|---|
| State | hidden |
| Dimensions | `A1:C11` |
| Approx role | lookup table |
| Inputs present | no |
| Calculations present | no |
| Outputs present | indirectly |

#### Purpose

Stores exchange-rate data used by Qatar pricing.

#### Table object

- Excel table: `Qatari_Riyal_Exchange_Rates_Table_Converter`
- Named range `xrates` points to this table.

#### Structure

- Column A: currency name
- Column B: QAR-based value
- Column C: inverse rate

#### Notes

- This is cleanly representable as seed data in a database or static config file.

## Named ranges

| Name | Refers to | Purpose |
|---|---|---|
| `AUSNAVIAZONES` | `Australia!$O$33:$R$74` | Australia customer/navia zone mapping |
| `AUSTNTRATES` | `Australia!$N$9:$W$15` | Australia service rate matrix |
| `currlist` | `Calculator!$F$12:$F$14` | trader currency choices |
| `CustomerList` | `Calculator!$A$4:$A$1080` | customer picker list |
| `CustomerListSA` | `Calculator!$A$1:$E$1080` | master customer-country-zone table |
| `DataList` | `Calculator!$A$3:$B$1080` | customer/country list |
| `EMAILS` | `Users!$A$2:$B$85` | user-to-email lookup |
| `QATARUSER` | `Users!$A$2:$C$85` | user-to-currency lookup |
| `S76RATES` | `Australia!$N$13:$W$15` | Australia S76 rates |
| `SAHSCODE` | `'Saudi Arabia'!$Q:$U` | Saudi HS code dataset |
| `Shipping` | `Calculator!$F$7:$F$9` | shipping method choices |
| `TNTRATES` | `Australia!$N$9:$W$11` | Australia TNT/T76 rates |
| `TNTZONES` | `Australia!$T$34:$Y$45` | Australia zone matrix |
| `Users` | `Users!$A$2:$A$85` | user list |
| `xrates` | `Qatari_Riyal_Exchange_Rates_Table_Converter[]` | Qatar exchange rates table |

## Formula analysis by sheet

## `Input`

Unique formula patterns:

- `=VLOOKUP(Calculator!I6,EMAILS,2,FALSE)` — email lookup
- `=Calculator!I6` — user passthrough
- `=Calculator!I8` — country passthrough
- `=D14` — reuse display currency
- Nested country dispatch formulas for:
  - destination notes
  - duty output
  - C+D output
  - currency label

Complex/volatile findings:

- Volatile functions detected: none
- Complex functions detected: none

## `Users`

Unique formula patterns:

- none

Complex/volatile findings:

- none

## `Calculator`

Unique formula patterns:

- `=VLOOKUP(I7,CustomerListSA,2,FALSE)` — derive country from selected customer

Complex/volatile findings:

- Volatile functions detected: none
- Complex functions detected: none

## `South Africa`

Unique formula patterns:

- `=SUM(B4:B10)` — total C+D
- `=VLOOKUP(Calculator!I7,CustomerListSA,3,FALSE)` — customer cartage lookup
- `=SUM(Input!C10*'South Africa'!C6)` — airline handling by weight
- `=SUM(B21+D20)` — cartage
- `=IF(B9=220,0,(SUM(B9*B23)))` — fuel logic
- `=IF('South Africa'!B20>'South Africa'!C20*Input!C10,'South Africa'!B20,'South Africa'!C20*Input!C10)` — min-vs-weight comparison
- `=SUM(B13*B22)+B18` — agency
- `=SUM(B13+B18+B14)` — total air
- `=SUM(B27:B32)` — total sea
- `=SUM(B37:B41)` — total courier
- `=IF(B1="AIR",B15,IF(B1="SEA",B33,IF(B1="COURIER",B42,"")))` — final route output

Complex/volatile findings:

- Volatile functions detected: none
- Complex functions detected: none

## `Singapore`

Unique formula patterns:

- `=IF(B3>C3*Input!C10,Singapore!B3,C3*Input!C10)` — terminal min-vs-variable
- `=IF(B4>C4*Input!C10,Singapore!B4,C4*Input!C10)` — agency min-vs-variable
- `=SUM(B8:B13)` — air total
- `=SUM(B19+B20+B28+B29+B22+B23+B24+B25+B26+B27)&"+59 SGD per CBM"` — sea total with text suffix
- `=IF(B1="AIR",B14,IF(B1="COURIER",B16,IF(B1="SEA",B30,"")))` — final route output

Complex/volatile findings:

- Volatile functions detected: none
- Complex functions detected: none

## `Australia`

Unique formula patterns of note:

- `=SUM(Input!C11*Australia!B2)` — duty
- `=SUM(Input!C11*Australia!B4)` — GST
- `=SUM(E4+B11+B3)` — disbursement figure
- `=IF(Input!C11>Australia!B7,Australia!C7,IF(Input!C11>B8,C8,IF(Input!C11<B9,C9,C9)))` — government charge bracket
- `=IF(B1="Courier",Q31,"Not Picked")` — courier delivery path
- `=IF(Q18<5,HLOOKUP(R7,AUSTNTRATES,5,FALSE),HLOOKUP(R7,AUSTNTRATES,6,FALSE))` — S76 base rate lookup
- `=HLOOKUP(R7,AUSTNTRATES,7,FALSE)` — rate after 5kg
- `=IF(Q18>5,U18*Q20+Q19,Q19)` — S76 freight
- `=HLOOKUP(R7,TNTRATES,2,FALSE)` — T76 base rate
- `=HLOOKUP(R7,TNTRATES,3,FALSE)` — T76 rate after 20kg
- `=IF(Q24>20,U24*Q26+Q25,Q25)` — T76 freight
- `=IF(Q23>Q29,Q29,Q23)` — choose cheaper service
- `=ROUNDUP(I40,0)` — CBM rounding for sea
- `=VLOOKUP(Calculator!I7,AUSNAVIAZONES,2,FALSE)` — customer zone lookup
- `=VLOOKUP(Calculator!I7,AUSNAVIAZONES,4,FALSE)` — navia zone lookup
- `=INDEX(TNTZONES,MATCH(W48,T35:T45,0),MATCH(W49,T34:Y34,0))` — matrix zone lookup
- `=IF(W61>W69,W69,W61)` — choose cheaper sea delivery service
- `=IF(B1="COURIER",B14,IF(B1="AIR",B37,IF(B1="SEA",B51,"")))` — final route output

Complex/volatile findings:

- Volatile functions detected: none
- Complex functions detected:
  - `INDEX + MATCH + MATCH` matrix lookup
  - multiple `HLOOKUP`-based service rate retrieval patterns

## `Saudi Arabia`

Unique formula patterns:

- bounded merchandise fee using nested `IF`
- `=SUM(Input!C11*'Saudi Arabia'!B3)` — duty
- `=SUM(B6:B7)` — total courier cost
- `=IF(B1="COURIER",B9,IF(B1="AIR",B15,IF(B1="SEA",B16,"")))` — final route output

Complex/volatile findings:

- Volatile functions detected: none
- Complex functions detected: none

## `Qatar`

Unique formula patterns:

- bounded merchandise fee using nested `IF`
- `=SUM(Input!C11*Qatar!B3)` — duty
- `=VLOOKUP(Calculator!I6,QATARUSER,3,0)` — trader currency
- `=VLOOKUP(C34,xrates,3,0)` — exchange rate lookup
- `=SUM(B34*B35)` — invoice conversion
- deeply nested `IF` for legalisation fee brackets
- `=SUM(B37/B35)` — fee conversion back from QAR
- `=SUM(B5+B6+B8)` — total courier
- `=IF(C1="COURIER",B9,IF(C1="AIR",B16,IF(C1="SEA",B17,)))` — final route output

Complex/volatile findings:

- Volatile functions detected: none
- Complex functions detected: none beyond nested bracket logic

## `Qatari Riyal Exchange Rates Tab`

Unique formula patterns:

- none

Complex/volatile findings:

- none

## VBA analysis

## Modules found

- `Sheet1.cls`
- `Sheet2.cls`
- `Sheet3.cls`
- `ThisWorkbook.cls`
- `Sheet4.cls`
- `Sheet5.cls`
- `Sheet6.cls`
- `Module1.bas`
- `Sheet7.cls`

Only `Sheet1.cls` contains substantive logic.

## Procedures found

### `Sheet1.cls`

#### `CommandButton1_Click`

What it does:

- Grabs current selection.
- Forces calculation and disables screen updating/events.
- Creates an Outlook email item.
- Calls `createImage(...)` to render the visible quote area as a JPG.
- Builds HTML email content.
- Uses:
  - `Range("A2").Value` for greeting
  - `Range("C6").Value` for quote subject/job reference
  - `Range("A1").Value` for recipient email
- Attaches the generated JPG and sends the email.

Business relevance:

- Important for workflow, but not for calculation correctness.
- In the web app this becomes an export/share feature, not a calculation dependency.

#### `createImage(SheetName As String, rngAddrss As String, nameFile As String)`

What it does:

- Activates `Input`.
- Copies range `B1:K26` as a picture.
- Pastes it into a temporary chart object.
- Exports the chart as JPG to the temp directory.
- Deletes the temporary chart object.

Business relevance:

- Purely presentational/export behavior.
- Replaceable with HTML-to-image / PDF export in the web app.

### Other modules

- `Sheet2.cls`, `Sheet3.cls`, `ThisWorkbook.cls`, `Sheet4.cls`, `Sheet5.cls`, `Sheet6.cls`, `Module1.bas`, `Sheet7.cls`
  - No substantive procedures detected.

## Data validation, conditional formatting, and external links

### Data validation

- No data validation rules were detected in the workbook.
- This suggests the workbook relies on hidden control cells and manual discipline rather than formal Excel validation.

### Conditional formatting

- No conditional formatting rules were detected that influence workbook logic.

### External links

- No external workbook links were detected.

## Input, intermediate, and output model

## Inputs

### Primary user-facing inputs

- selected user
- selected customer
- selected shipping method
- job number
- chargeable weight
- invoice value

### Derived inputs

- country derived from selected customer
- trader currency derived from selected user for Qatar logic
- customer delivery zone / cartage metadata derived from customer lookup tables

## Intermediate calculations

- country dispatch on `Input`
- duty calculations by country
- min/max-bounded fees
- weight-based freight charges
- invoice bracket lookups
- service option comparisons
- exchange-rate conversions
- zone lookups and matrix lookups

## Outputs

- destination notes
- duty amount
- clearance and delivery amount
- display currency
- final quote-by-transport result
- recipient email for generated quote

## Lookup/reference tables

- users/emails/currency
- customer master with country and delivery metadata
- Australia TNT/S76/T76 rate tables
- Australia Navia/TNT zone maps
- Qatar exchange-rate table
- Saudi HS code duty reference table

## Concise proposed data model for web rebuild

## Core entities

### `User`

- `id`
- `name`
- `email`
- `defaultCurrency`

### `Customer`

- `id`
- `name`
- `countryCode`
- `deliveryZone`
- `ratePerKg` nullable
- `surcharge` nullable
- country-specific metadata fields as needed

### `QuoteInput`

- `userId`
- `customerId`
- `shippingMethod`
- `jobNumber`
- `chargeableWeightKg`
- `invoiceValue`

### `QuoteContext`

- derived `countryCode`
- derived `traderCurrency`
- derived customer zone/routing metadata

### `CountryRuleSet`

- `countryCode`
- fee constants
- thresholds
- bracket tables
- rate tables
- routing tables
- explanatory notes

### `QuoteResult`

- `countryCode`
- `dutyAmount`
- `clearanceAndDeliveryAmount`
- `currency`
- `destinationNotes`
- optional textual qualifiers such as Singapore sea `+59 SGD per CBM`
- breakdown lines for UI transparency

## Supporting datasets

- Australia rate matrices
- Australia zone matrix
- Qatar exchange rates
- Saudi HS code reference data

## Recommended rebuild architecture

## Recommendation

Use **Next.js + React + TypeScript** with a **TypeScript calculation engine** and structured reference data stored in JSON or a database.

## Why this is the default recommendation

- Formula complexity is moderate, not extreme.
- No volatile Excel functions were found.
- No array formulas, `LAMBDA`, `LET`, `OFFSET`, or `INDIRECT` were found.
- Core workbook behavior is deterministic and table-driven.
- VBA is not part of the calculation engine; it only handles email/image export.
- This supports a clean frontend-first rebuild with strong testability.

## Proposed architecture

### Frontend

- Next.js App Router
- React + TypeScript
- form-driven quote builder UI
- country-specific result breakdown panels
- export/share UI instead of VBA button

### Domain/calculation layer

- pure TypeScript pricing engine
- one calculator module per country:
  - `southAfrica.ts`
  - `singapore.ts`
  - `australia.ts`
  - `saudiArabia.ts`
  - `qatar.ts`
- shared helpers for:
  - bracket selection
  - min/max fee logic
  - currency conversion
  - matrix lookup
  - service comparison

### Data layer

- seed tables extracted from workbook into structured JSON or DB tables
- recommended DB if the business will edit reference data in-app
- otherwise versioned JSON seed files are enough initially

### Testing

- unit tests for each country pricing engine
- golden test fixtures comparing web-engine outputs to sample workbook scenarios
- regression tests for zone and bracket edge cases

### Export features

- replace Outlook/VBA workflow with:
  - HTML email template generation
  - PDF export
  - image export of quote summary if needed

## When to consider a Python/FastAPI backend instead

Use a backend calculation service only if one of these becomes true:

- business wants non-developers editing complex pricing tables frequently
- Saudi HS logic expands into a large searchable tariff engine with rule interpretation
- future workbook versions add macro-heavy automation or nontrivial document generation
- calculation parity is easier to maintain in a centralized service

Based on the current workbook, I would **not** start with a Python-first backend. It looks unnecessary for version 1 of the rebuild.

## Phased implementation plan

## Phase 0 — Workbook parity specification

### Deliverables

- confirmed formula mapping per country
- extracted reference data sets
- agreed output expectations for representative sample quotes

### Rough effort

- 2–4 days

### Notes

- Validate assumptions where workbook contains placeholders or textual outputs.

## Phase 1 — Domain model and data extraction

### Deliverables

- normalized `User`, `Customer`, and country reference datasets
- migration/seed scripts
- schema for quote input/output payloads

### Rough effort

- 2–4 days

### Risks

- hidden workbook assumptions may not be obvious until data is normalized

## Phase 2 — Calculation engine

### Deliverables

- TypeScript calculators for each country
- shared helper library for lookup/bracket/min-max logic
- unit tests per country

### Rough effort

- 5–8 days

### Risks

- Australia service/zone logic
- Singapore mixed text/number result behavior
- Qatar legalisation + exchange-rate conversion

## Phase 3 — Quote builder UI

### Deliverables

- form for user/customer/method/job/weight/invoice input
- live calculated result panel
- destination notes and currency display
- transparent cost breakdown by country

### Rough effort

- 4–6 days

### Risks

- matching current workbook operator workflow closely enough

## Phase 4 — Export and sharing workflow

### Deliverables

- printable quote view
- PDF export
- email/share workflow replacing Outlook macro

### Rough effort

- 2–4 days

### Risks

- exact parity with screenshot-based workbook email may not be desired; product decision needed

## Phase 5 — Parity testing and rollout

### Deliverables

- comparison pack of workbook vs web outputs
- bug fixes from edge-case scenarios
- deployment checklist

### Rough effort

- 3–5 days

### Risks

- workbook may contain manual operator knowledge not encoded in formulas

## Overall rough effort

- **MVP parity**: about **3–5 weeks**
- likely faster if limited initially to currently modeled transport paths and countries

## Key rebuild risks

1. **Australia complexity**
   - most intricate logic, embedded rate tables, and cheapest-service selection.
2. **Hidden operational assumptions**
   - destination notes imply operators may apply judgment outside formulas.
3. **Mixed output types**
   - Singapore sea output is a formatted text string, not just a number.
4. **Large Saudi reference dataset**
   - HS code data should not be ported as a worksheet clone.
5. **Workbook control flow is hidden**
   - visible `Input` is not the true source of user state; web UX must expose the real controls cleanly.

## Recommended next step after this analysis

Before building code, define a parity specification with 5–10 representative quote scenarios:

- one scenario per country
- at least two for Australia
- one Qatar example covering legalisation fee conversion
- one South Africa example covering cartage minimum logic

That will let the rebuild validate the TypeScript engine against known workbook outputs from the start.