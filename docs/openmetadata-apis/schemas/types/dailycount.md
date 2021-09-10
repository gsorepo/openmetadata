# Daily Count

This schema defines the type for reporting the daily count of some measurement. For example, you might use this schema for the number of times a table is queried each day.

**$id:** [**https://open-metadata.org/schema/type/dailyCount.json**](https://open-metadata.org/schema/type/dailyCount.json)

Type: `object`

This schema does not accept additional properties.

## Properties

* **count** `required`
  * Daily count of a measurement on the given date.
  * Type: `integer`
  * Range:  ≥ 0
* **date** `required`
  * $ref: [basic.json\#/definitions/date](basic.md#date)

_This document was updated on: Thursday, August 26, 2021_

