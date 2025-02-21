import {and, or, hasOption, rankWith} from '@jsonforms/core';

export default rankWith(
    5,
    and(
        hasOption("apiUrl"),
        or(
            hasOption("valueField"),
            hasOption("jq")
        )
    )
);