# Crypto.com NFT — GraphQL Reference (v2)

> Captured from `crypto.com/nft` via HAR export. **42 unique operations** documented, with all observed variable variants and decoded enum values.
> Source of truth for building features into CRONOS.WTF.

## What's new in v2 vs v1

- 🆕 **7 new operations** discovered: `GetMarketplaceAssets`, `getPublicSharedConfigs`, `GetAggregatedAttributeOptions`, `UserMetrics`, `NavTopCollections`, `GetTopCreators`, `DiscoverPageTopCollections`.
- 🔍 **Decoded enum values** for `TimeRange`, `Curation`, `TopCollectiblesFilter`, `TopCollectiblesFilterBy`, `SupportedNetwork`, `AssetKind`, event natures, etc.
- 🧩 **Decoded shapes** for the `AssetsSearch` input filter and multi-field sort.
- 📑 **Multiple variable variants** documented for big operations (different sort fields, filter combos, tabs).

## Endpoint

```
POST https://crypto.com/nft-api/graphql
Content-Type: application/json
```

Body:

```json
{ "operationName": "...", "query": "...", "variables": { ... } }
```

-----

## 🔑 Decoded enums (call `getPublicSharedConfigs` once to get them dynamically)

### `TimeRange`

Used in `GetCollectionsPage`, `GetCollections` etc.

```
ONE_DAY | SEVEN_DAYS | THIRTY_DAYS | ALL
```

**Sort field has to match**: `totalSalesDecimalInLast1Day` / `totalSalesDecimalInLast7Days` / `totalSalesDecimalInLast30Days` / `totalSalesDecimalAllTime`. Always pair the two.

### `TopCollectiblesFilter` (time window for top collectibles)

```
LATEST_1_DAY | LATEST_7_DAYS | LATEST_30_DAYS | ALL_TIME
```

### `TopCollectiblesFilterBy` (metric)

```
VOLUME | LIKE | VIEW
```

### `SupportedNetwork`

```
CRO     → Cronos POS Chain (the original NFT chain)
CRONOS  → Cronos EVM chain (different network!)
ETH     → Ethereum
MATIC   → Polygon
SOL     → Solana
```

⚠️ **`CRO` and `CRONOS` are NOT the same** — make sure you pick the right one when filtering.

### `Categories` (id values)

```
art | celebrities | gaming | sport | music | crypto | external_nft ("Cross Chain")
```

### `Curation`

```
CURATED | NON_CURATED
```

### `AssetKind`

```
COLLECTIBLE | OPEN_COLLECTIBLE | PACK
```

### `ListingType`

```
BUY_NOW | AUCTION | OPEN_FOR_OFFERS  (and likely NOT_FOR_SALE)
```

### `Audience` (used in `GetMarketplaceAssets`)

```
MARKETPLACE  (others probably exist — DROPS / PROFILE — to confirm)
```

### Event `nature` values

Used in `getCollectionEventHistory` `naturesIn` filter:

```
Confirmed (collection): listed | transferred | bid_made
Confirmed (edition):    airdropped | transferred
Confirmed (offers):     offer_made | offer_rejected
Likely also: sold | minted | bid_accepted | bid_withdrawn | offer_accepted | delisted
```

-----

## 🧩 Filter shapes

### `AssetsSearch` (used in `GetMarketplaceAssets`, `GetCollectionAssets`, `GetProfileAssets`)

Marketplace variant:

```typescript
{
  creatorName: string | null,
  assetName:   string | null,
  description: string | null,
  minPrice:    number | null,
  maxPrice:    number | null,
  buyNow:      boolean,
  auction:     boolean,
  chains:      string[]    // SupportedNetwork ids
}
```

Collection variant (adds `attributes`):

```typescript
{
  assetName:   string | null,
  description: string | null,
  minPrice:    number | null,
  maxPrice:    number | null,
  buyNow:      boolean,
  auction:     boolean,
  attributes:  Array<{ traitType: string, value: string }>,
  chains:      string[]
}
```

### `SingleFieldSort` (multi-sort supported as array)

```typescript
{ field: string, order: "ASC" | "DESC" }
```

Example multi-sort (marketplace default):
`[{order:DESC, field:curation}, {order:DESC, field:sortingRank}, {order:DESC, field:recentViews}]`

### Common sort fields observed

```
Collection lists : totalSalesDecimalInLast1Day / 7Days / 30Days / AllTime
                   floorPrice / owners / items / verified
Asset lists      : price / createdAt / curation / sortingRank / recentViews / rarity
Event history    : createdAt (cursor-based)
```

### Pagination

```
Most lists           : first + skip   (offset)
getCollectionEventHistory: first + after  (cursor — base64 token)
```

-----

## Configuration & Public Data

*Public configuration, shared enums, navigation hints. Call once at app boot.*

### `getPublicSharedConfigs`

🆕 **Critical** — Returns ALL valid enum values (categories, networks, top filter ranges/metrics), auction limits, supported countries. Call this at app boot to drive your UI dropdowns/filters dynamically.

**Query**

```graphql
query getPublicSharedConfigs {
  public {
    sharedConfigs {
      AUCTION_MAX_HOURS
      CDC_NFT_SALE_LISTING_DEFAULT_EXPIRY_MONTHS
      ANTI_SNIPING_EXTENSION_MINUTES
      WEEKLY_CREDIT_CARD_BALANCE_DROPS_LIMIT
      WEEKLY_CREDIT_CARD_BALANCE_MARKETPLACE_LIMIT_FOR_APP_CONNECTED
      WEEKLY_CREDIT_CARD_BALANCE_MARKETPLACE_LIMIT_FOR_SMS_VERIFIED
      WEEKLY_CREDIT_CARD_BALANCE_MARKETPLACE_LIMIT_FOR_RUBY_OR_ABOVE
      WEEKLY_CREDIT_CARD_BALANCE_MARKETPLACE_LIMIT_FOR_CARD_CRO_STAKED
      EXACT_THEN_RANDOM_LISTING_ENABLED
      categories {
        id
        name
        __typename
      }
      topCollectiblesFilters
      topCollectiblesFiltersBy
      countries {
        countryCallingCode
        countryCode
        __typename
      }
      AUCTION_RESTRICTION_BUFFER
      MAX_AUCTION_CREDIT_CARD_DURATION_DAY
      supportedNetworks {
        id
        name
        __typename
      }
      CONTENT_MODERATION_ENABLED
      CONTENT_MODERATION_TIMEOUT
      countryCode
      __typename
    }
    __typename
  }
}
```

### `NavTopCollections`

🆕 Lightweight list of top collections for the nav menu (id + name only).

**Variables**

| Name      | Type | Example value         |
|-----------|------|-----------------------|
| `cacheId` | `ID` | `"navTopCollections"` |

**Query**

```graphql
query NavTopCollections($cacheId: ID) {
  public(cacheId: $cacheId) {
    navTopCollections {
      id
      name
      __typename
    }
    __typename
  }
}
```

### `DiscoverPageTopCollections`

🆕 Top N collections for the Discover page hero (with logo, banner, item count, verified).

**Variables**

| Name      | Type  | Example value                     |
|-----------|-------|-----------------------------------|
| `cacheId` | `ID`  | `"discover-page-top-collections"` |
| `first`   | `Int` | `10`                              |

**Query**

```graphql
query DiscoverPageTopCollections($cacheId: ID, $first: Int) {
  public(cacheId: $cacheId) {
    navTopCollections(first: $first) {
      id
      name
      logo {
        url
        __typename
      }
      banner {
        url
        __typename
      }
      metrics {
        items
        __typename
      }
      verified
      __typename
    }
    __typename
  }
}
```

### `GetTopCreators`

🆕 Top users by primary sales (the leaderboard of creators on the homepage).

**Variables**

| Name           | Type        | Example value                                                                                                       |
|----------------|-------------|---------------------------------------------------------------------------------------------------------------------|
| `excludeUuids` | `[String!]` | `["64da15bf-8d88-456b-bd45-5dc5b61f52d3", "6a80c426-af6e-4ab9-a48a-8e2680992257", "fbc5e68e-2f44-41a3-951f-2..."]`  |

**Query**

```graphql
query GetTopCreators($excludeUuids: [String!]) {
  public(cacheId: "topCreators") {
    users(excludeUuids: $excludeUuids) {
      uuid
      username
      displayName
      primarySalesDecimalTruncated
      avatar {
        url
        __typename
      }
      verified
      __typename
    }
    __typename
  }
}
```

-----

## Drops

*Live, upcoming and ended drops on the marketplace.*

### `LiveAndUpcomingDrops`

List of live + upcoming drops.

**Variables**

| Name      | Type  | Example value                           |
|-----------|-------|-----------------------------------------|
| `cacheId` | `ID`  | `"dropsPage-liveAndUpcomingDrops-en"`   |
| `first`   | `Int` | `100`                                   |

**Observed variants** (2 unique)

- `{}`
- `{"first": 100}`

**Query**

```graphql
query LiveAndUpcomingDrops($cacheId: ID, $first: Int) {
  public(cacheId: $cacheId) {
    liveAndUpcomingDrops(first: $first) {
      id
      name
      description
      cover {
        url
        __typename
      }
      creator {
        displayName
        username
        avatar {
          url
          __typename
        }
        verified
        __typename
      }
      startAt
      endAt
      isPublicReadOnly
      premiumDropConfig {
        endAt
        id
        startAt
        type
        __typename
      }
      __typename
    }
    __typename
  }
}
```

### `EndedDrops`

Paginated list of ended drops.

**Variables**

| Name      | Type  | Example value                 |
|-----------|-------|-------------------------------|
| `first`   | `Int` | `9`                           |
| `skip`    | `Int` | `0`                           |
| `cacheId` | `ID`  | `"dropsPage-endedDrops-en"`   |

**Query**

```graphql
query EndedDrops($first: Int, $skip: Int, $cacheId: ID) {
  public(cacheId: $cacheId) {
    endedDrops(first: $first, skip: $skip) {
      id
      name
      description
      cover {
        url
        __typename
      }
      creator {
        displayName
        username
        avatar {
          url
          __typename
        }
        verified
        __typename
      }
      startAt
      endAt
      isPublicReadOnly
      premiumDropConfig {
        endAt
        id
        startAt
        type
        __typename
      }
      __typename
    }
    __typename
  }
}
```

### `getDropStatuses`

Bulk status check for a list of drop IDs (used to refresh status badges in real time).

**Variables**

| Name      | Type      | Example value                                                                |
|-----------|-----------|------------------------------------------------------------------------------|
| `ids`     | `[ID!]!`  | `["f21caaba579eb60dcd21db69f0b7501e", "718c192adc9c103b8191c052f08df249"]`   |
| `cacheId` | `ID`      | `null`                                                                       |

**Query**

```graphql
query getDropStatuses($ids: [ID!]!, $cacheId: ID) {
  public(cacheId: $cacheId) {
    dropStatuses(ids: $ids) {
      dropId
      status
      __typename
    }
    __typename
  }
}
```

### `Drop`

Full detail of a single drop (creator, dates, premium config, packs).

**Variables**

| Name      | Type   | Example value                                          |
|-----------|--------|--------------------------------------------------------|
| `id`      | `ID!`  | `"718c192adc9c103b8191c052f08df249"`                   |
| `cacheId` | `ID`   | `"select-drop-718c192adc9c103b8191c052f08df249-en"`    |

**Query**

```graphql
fragment DropDetail on Drop {
  id
  name
  cover {
    url
    __typename
  }
  creator {
    uuid
    id
    displayName
    username
    bio
    avatar {
      url
      __typename
    }
    instagramUsername
    facebookUsername
    twitterUsername
    verified
    __typename
  }
  creatorInfo
  description
  startAt
  endAt
  showCollectible
  video {
    url
    __typename
  }
  whatInsideDescription
  termsAndConditions
  isPublicReadOnly
  premiumDropConfig {
    description
    endAt
    id
    startAt
    type
    title
    __typename
  }
  queueMode
  __typename
}

query Drop($id: ID!, $cacheId: ID) {
  public(cacheId: $cacheId) {
    drop(id: $id) {
      ...DropDetail
      __typename
    }
    __typename
  }
}
```

### `GetDropAssetsQuery`

Paginated assets inside a drop, with sort and asset kind filter.

**Variables**

| Name      | Type                  | Example value                                          |
|-----------|-----------------------|--------------------------------------------------------|
| `id`      | `ID!`                 | `"718c192adc9c103b8191c052f08df249"`                   |
| `cacheId` | `ID`                  | `"getDropAssets-718c192adc9c103b8191c052f08df249"`     |
| `first`   | `Int`                 | `36`                                                   |
| `skip`    | `Int`                 | `0`                                                    |
| `sort`    | `[SingleFieldSort!]`  | `[{"field": "name", "order": "ASC"}]`                  |
| `kinds`   | `[AssetKind!]!`       | `["COLLECTIBLE", "OPEN_COLLECTIBLE"]`                  |

**Query**

```graphql
fragment AssetBaseDetail on Asset {
  id
  name
  copies
  copiesInCirculation
  main {
    url
    __typename
  }
  cover {
    url
    __typename
  }
  primaryListingsCount
  secondaryListingsCount
  isCurated
  isSoulbound
  isExternalNft
  __typename
}

fragment AssetListing on Listing {
  id
  editionId
  priceDecimal
  auctionMinPriceDecimal
  auctionCloseAt
  mode
  salePriceDecimalUSD
  auctionHasBids
  currency
  source
  seller {
    id
    uuid
    __typename
  }
  __typename
}

fragment DefaultPrimaryListing on Asset {
  primaryListingsCount
  primarySalesCount
  defaultPrimaryListing {
    ...AssetListing
    primary
    source
    externalUser {
      address
      username
      avatar {
        url
        __typename
      }
      __typename
    }
    __typename
  }
  __typename
}

query GetDropAssetsQuery($id: ID!, $cacheId: ID, $first: Int, $skip: Int, $sort: [SingleFieldSort!], $kinds: [AssetKind!]!) {
  public(cacheId: $cacheId) {
    assets(dropId: $id, first: $first, skip: $skip, sort: $sort, kinds: $kinds) {
      ...AssetBaseDetail
      description
      collectiblePerPack
      createdAt
      collection {
        logo {
          url
          __typename
        }
        id
        name
        verified
        __typename
      }
      kind
      primarySalesCount
      externalNftMetadata {
        network
        __typename
      }
      ...DefaultPrimaryListing
      __typename
    }
    __typename
  }
}
```

### `GetAssetsInPack`

Assets contained in a specific pack inside a drop.

**Variables**

| Name      | Type   | Example value                                          |
|-----------|--------|--------------------------------------------------------|
| `dropId`  | `ID!`  | `"718c192adc9c103b8191c052f08df249"`                   |
| `packId`  | `ID!`  | `"3abb2993e92b7fe44a8cfba5c201471f"`                   |
| `cacheId` | `ID`   | `"GetAssetsInPack-3abb2993e92b7fe44a8cfba5c201471f"`   |
| `first`   | `Int`  | `12`                                                   |

**Query**

```graphql
query GetAssetsInPack($dropId: ID!, $packId: ID!, $cacheId: ID, $first: Int) {
  public(cacheId: $cacheId) {
    assets(
      dropId: $dropId
      packId: $packId
      first: $first
      skip: 0
      kinds: [COLLECTIBLE, PACK]
    ) {
      id
      name
      description
      copies
      createdAt
      collection {
        logo {
          url
          __typename
        }
        id
        name
        verified
        __typename
      }
      cover {
        url
        __typename
      }
      main {
        url
        __typename
      }
      kind
      defaultPrimaryListing {
        editionId
        priceDecimal
        mode
        auctionHasBids
        primary
        salePriceDecimalUSD
        currency
        __typename
      }
      externalNftMetadata {
        network
        __typename
      }
      isExternalNft
      isCurated
      __typename
    }
    __typename
  }
}
```

-----

## Marketplace

*Main marketplace assets browse — central feature of the official site.*

### `GetMarketplaceAssets`

🆕 **Critical** — The query behind `/nft/marketplace`. Highly powerful: filter by audience, brand, categories, collection, creator, owner, listing types, curation, plus an `AssetsSearch` filter (name/description/price range/buyNow/auction/chains).

**Variables**

| Name                  | Type                  | Example value                                                                              |
|-----------------------|-----------------------|--------------------------------------------------------------------------------------------|
| `audience`            | `Audience`            | `"MARKETPLACE"`                                                                            |
| `brandId`             | `ID`                  | `null`                                                                                     |
| `categories`          | `[ID!]`               | `[]`                                                                                       |
| `collectionId`        | `ID`                  | `null`                                                                                     |
| `creatorId`           | `ID`                  | `null`                                                                                     |
| `ownerId`             | `ID`                  | `null`                                                                                     |
| `first`               | `Int!`                | `60`                                                                                       |
| `skip`                | `Int!`                | `0`                                                                                        |
| `cacheId`             | `ID`                  | `"getMarketplaceAssetsQuery-9dd7c0a471f4db786b640cf8a7170cf1f69e53ea"`                     |
| `hasSecondaryListing` | `Boolean`             | `null`                                                                                     |
| `where`               | `AssetsSearch`        | `{...}`                                                                                    |
| `sort`                | `[SingleFieldSort!]`  | `[{"order":"DESC","field":"curation"}, {"order":"DESC","field":"sortingRank"}, ...]`       |
| `isCurated`           | `Boolean`             | `null`                                                                                     |
| `createdPublicView`   | `Boolean`             | `null`                                                                                     |
| `listingTypes`        | `[ListingType!]`      | `["BUY_NOW"]`                                                                              |
| `collections`         | `[ID!]`               | `[]`                                                                                       |
| `curation`            | `[Curation!]`         | `["CURATED"]`                                                                              |

**Query**

```graphql
fragment AssetBaseDetail on Asset {
  id
  name
  copies
  copiesInCirculation
  main {
    url
    __typename
  }
  cover {
    url
    __typename
  }
  primaryListingsCount
  secondaryListingsCount
  isCurated
  isSoulbound
  isExternalNft
  __typename
}

fragment AssetListing on Listing {
  id
  editionId
  priceDecimal
  auctionMinPriceDecimal
  auctionCloseAt
  mode
  salePriceDecimalUSD
  auctionHasBids
  currency
  source
  seller {
    id
    uuid
    __typename
  }
  __typename
}

fragment DefaultListingV2WithFilter on Asset {
  defaultListingV2(where: $where, listingTypes: $listingTypes, sort: $sort) {
    ...AssetListing
    __typename
  }
  __typename
}

query GetMarketplaceAssets($audience: Audience, $brandId: ID, $categories: [ID!], $collectionId: ID, $creatorId: ID, $ownerId: ID, $first: Int!, $skip: Int!, $cacheId: ID, $hasSecondaryListing: Boolean, $where: AssetsSearch, $sort: [SingleFieldSort!], $isCurated: Boolean, $createdPublicView: Boolean, $listingTypes: [ListingType!], $collections: [ID!], $curation: [Curation!]) {
  public(cacheId: $cacheId) {
    assets: marketplaceAssets(
      audience: $audience
      brandId: $brandId
      categories: $categories
      collectionId: $collectionId
      creatorId: $creatorId
      ownerId: $ownerId
      first: $first
      skip: $skip
      hasSecondaryListing: $hasSecondaryListing
      where: $where
      sort: $sort
      isCurated: $isCurated
      createdPublicView: $createdPublicView
      listingTypes: $listingTypes
      collections: $collections
      curation: $curation
    ) {
      ...AssetBaseDetail
      collection {
        logo {
          url
          __typename
        }
        id
        name
        verified
        __typename
      }
      drop {
        id
        __typename
      }
      ...DefaultListingV2WithFilter
      externalNftMetadata {
        network
        isSuspicious
        __typename
      }
      offerableEditionId
      __typename
    }
    __typename
  }
}
```

-----

## Collections — Discovery

*Collection listings, top collectibles, brands, categories.*

### `GetTopCollectibles`

Top collectibles ranked by `topCollectiblesFilterBy` (VOLUME / LIKE / VIEW) over `topCollectiblesFilter` (1D / 7D / 30D / ALL).

**Variables**

| Name                       | Type                       | Example value                                                            |
|----------------------------|----------------------------|--------------------------------------------------------------------------|
| `topCollectiblesFilter`    | `TopCollectiblesFilter!`   | `"LATEST_7_DAYS"`                                                        |
| `topCollectiblesFilterBy`  | `TopCollectiblesFilterBy!` | `"VOLUME"`                                                               |
| `cacheId`                  | `ID`                       | `"getTopCollectiblesQuery-TopCollectibleBlock-VOLUME-LATEST_7_DAYS-30"`  |
| `brandId`                  | `ID`                       | `null`                                                                   |
| `page`                     | `Int`                      | `1`                                                                      |
| `pageSize`                 | `Int`                      | `30`                                                                     |

**Query**

```graphql
fragment AssetListing on Listing {
  id
  editionId
  priceDecimal
  auctionMinPriceDecimal
  auctionCloseAt
  mode
  salePriceDecimalUSD
  auctionHasBids
  currency
  source
  seller {
    id
    uuid
    __typename
  }
  __typename
}

fragment DefaultListingV2 on Asset {
  defaultListingV2 {
    ...AssetListing
    __typename
  }
  __typename
}

query GetTopCollectibles($topCollectiblesFilter: TopCollectiblesFilter!, $topCollectiblesFilterBy: TopCollectiblesFilterBy!, $cacheId: ID, $brandId: ID, $page: Int, $pageSize: Int) {
  public(cacheId: $cacheId) {
    topCollectibles(
      filter: $topCollectiblesFilter
      filterBy: $topCollectiblesFilterBy
      brandId: $brandId
      page: $page
      pageSize: $pageSize
    ) {
      id
      name
      copies
      copiesInCirculation
      main {
        url
        __typename
      }
      cover {
        url
        __typename
      }
      collection {
        logo {
          url
          __typename
        }
        id
        name
        verified
        __typename
      }
      primaryListingsCount
      secondaryListingsCount
      latestPurchasedEdition {
        id
        priceUSD
        __typename
      }
      totalSalesDecimal
      ...DefaultListingV2
      recentLikes
      recentViews
      isCurated
      isSoulbound
      defaultEditionId
      externalNftMetadata {
        network
        isSuspicious
        __typename
      }
      __typename
    }
    __typename
  }
}
```

### `GetCollections`

Generic paginated collections listing with stats and many filters.

**Variables**

| Name                    | Type               | Example value                                                     |
|-------------------------|--------------------|-------------------------------------------------------------------|
| `cacheId`               | `ID`               | `"getCollectionsQuery-090de46a870d906cb28091580934b22db013a805"`  |
| `search`                | `String`           | `null`                                                            |
| `first`                 | `Int`              | `15`                                                              |
| `skip`                  | `Int`              | `null`                                                            |
| `sort`                  | `SingleFieldSort`  | `{"field": "totalSalesDecimalInLast1Day", "order": "DESC"}`       |
| `withStats`             | `Boolean!`         | `true`                                                            |
| `collectionIds`         | `[ID!]`            | `null`                                                            |
| `isSortFieldZeroLast`   | `Boolean!`         | `true`                                                            |
| `verifiedOnly`          | `Boolean`          | `true`                                                            |
| `verifiedFirst`         | `Boolean`          | `false`                                                           |
| `creatorId`             | `ID`               | `null`                                                            |
| `assetOwnerId`          | `ID`               | `null`                                                            |
| `assetCreatorId`        | `ID`               | `null`                                                            |
| `assetLikedById`        | `ID`               | `null`                                                            |
| `hideEmpty`             | `Boolean`          | `false`                                                           |

**Query**

```graphql
query GetCollections($cacheId: ID, $search: String, $first: Int, $skip: Int, $sort: SingleFieldSort, $withStats: Boolean!, $collectionIds: [ID!], $isSortFieldZeroLast: Boolean!, $verifiedOnly: Boolean, $verifiedFirst: Boolean, $creatorId: ID, $assetOwnerId: ID, $assetCreatorId: ID, $assetLikedById: ID, $hideEmpty: Boolean) {
  public(cacheId: $cacheId) {
    collections(
      search: $search
      first: $first
      skip: $skip
      sort: $sort
      collectionIds: $collectionIds
      isSortFieldZeroLast: $isSortFieldZeroLast
      verifiedOnly: $verifiedOnly
      verifiedFirst: $verifiedFirst
      creatorId: $creatorId
      assetOwnerId: $assetOwnerId
      assetCreatorId: $assetCreatorId
      assetLikedById: $assetLikedById
      hideEmpty: $hideEmpty
    ) {
      id
      name
      creator {
        username
        __typename
      }
      logo {
        url
        __typename
      }
      banner {
        url
        __typename
      }
      verified
      metrics {
        items
        __typename
      }
      stats @include(if: $withStats) {
        floorPriceDecimal
        oneDayFloorPriceDecimal
        oneDayFloorPriceDecimalChange
        oneDayVolumeDecimal
        oneDayVolumeDecimalChange
        sevenDayFloorPriceDecimal
        sevenDayFloorPriceDecimalChange
        sevenDayVolumeDecimal
        sevenDayVolumeDecimalChange
        thirtyDayFloorPriceDecimal
        thirtyDayFloorPriceDecimalChange
        thirtyDayVolumeDecimal
        thirtyDayVolumeDecimalChange
        __typename
      }
      __typename
    }
    __typename
  }
}
```

### `getCronosPosCollections`

Collections filtered by `SupportedNetwork` (e.g. `[CRO]` for Cronos POS).

**Query**

```graphql
query getCronosPosCollections($cacheId: ID, $search: String, $first: Int, $skip: Int, $sort: SingleFieldSort, $categories: [ID!], $networks: [SupportedNetwork!], $isSortFieldZeroLast: Boolean!, $timeRange: TimeRange, $hideEmpty: Boolean, $verifiedOnly: Boolean, $verifiedFirst: Boolean) {
  public(cacheId: $cacheId) {
    collections(
      search: $search
      first: $first
      skip: $skip
      sort: $sort
      categories: $categories
      networks: $networks
      isSortFieldZeroLast: $isSortFieldZeroLast
      timeRange: $timeRange
      hideEmpty: $hideEmpty
      verifiedOnly: $verifiedOnly
      verifiedFirst: $verifiedFirst
    ) {
      id
      name
      logo {
        url
        __typename
      }
      banner {
        url
        __typename
      }
      verified
      creator {
        username
        __typename
      }
      __typename
    }
    __typename
  }
}
```

### `GetFeaturedCollections`

Hand-curated featured collections.

```graphql
query GetFeaturedCollections {
  public {
    featuredCollections {
      id
      collection {
        id
        name
        logo { url __typename }
        banner { url __typename }
        verified
        creator { username __typename }
        __typename
      }
      image { url __typename }
      __typename
    }
    __typename
  }
}
```

### `GetBrands`

```graphql
query GetBrands {
  public {
    brands {
      id
      username
      name
      creator {
        avatar { url __typename }
        verified
        __typename
      }
      __typename
    }
    __typename
  }
}
```

### `getCategories`

```graphql
query getCategories($first: Int, $skip: Int) {
  public {
    categories(first: $first, skip: $skip) {
      id
      name
      unselectable
      __typename
    }
    __typename
  }
}
```

### `GetCollectionsPage`

Main `/collections` page query — stats, sort, time range, networks. Same as discovery but with `withStats: true`.

```graphql
query GetCollectionsPage($cacheId: ID, $search: String, $first: Int, $skip: Int, $sort: SingleFieldSort, $withStats: Boolean!, $categories: [ID!], $networks: [SupportedNetwork!], $isSortFieldZeroLast: Boolean!, $timeRange: TimeRange, $hideEmpty: Boolean, $verifiedOnly: Boolean) {
  public(cacheId: $cacheId) {
    collections(
      search: $search
      first: $first
      skip: $skip
      sort: $sort
      categories: $categories
      networks: $networks
      isSortFieldZeroLast: $isSortFieldZeroLast
      timeRange: $timeRange
      hideEmpty: $hideEmpty
      verifiedOnly: $verifiedOnly
    ) {
      ...CollectionStatsData
      __typename
    }
    __typename
  }
}

fragment CollectionStatsData on Collection {
  id
  creator { username __typename }
  name
  logo { url __typename }
  metrics {
    listedCollectiblesCount
    owners
    items
    editionsCount
    totalSalesDecimal
    minSaleListingPriceDecimal
    __typename
  }
  verified
  stats @include(if: $withStats) {
    floorPriceDecimal
    allDayBuyerCount
    oneDayBuyerCount
    oneDayFloorPriceDecimal
    oneDayFloorPriceDecimalChange
    oneDayVolumeDecimal
    oneDayVolumeDecimalChange
    sevenDayBuyerCount
    sevenDayFloorPriceDecimal
    sevenDayFloorPriceDecimalChange
    sevenDayVolumeDecimal
    sevenDayVolumeDecimalChange
    thirtyDayBuyerCount
    thirtyDayFloorPriceDecimal
    thirtyDayFloorPriceDecimalChange
    thirtyDayVolumeDecimal
    thirtyDayVolumeDecimalChange
    __typename
  }
  __typename
}
```

### `GetCollectionsPageInfo`

Counter / total info for the `/collections` page.

```graphql
query GetCollectionsPageInfo($cacheId: ID, $search: String, $first: Int, $skip: Int, $sort: SingleFieldSort, $categories: [ID!], $networks: [SupportedNetwork!], $hideEmpty: Boolean, $verifiedOnly: Boolean) {
  public(cacheId: $cacheId) {
    collectionsPageInfo(
      search: $search
      first: $first
      skip: $skip
      sort: $sort
      categories: $categories
      networks: $networks
      hideEmpty: $hideEmpty
      verifiedOnly: $verifiedOnly
    ) {
      count
      __typename
    }
    __typename
  }
}
```

-----

## Collection — Detail

*Per-collection detail and analytics.*

### `GetCollection`

Static metadata of one collection (header card).

```graphql
query GetCollection($collectionId: ID!) {
  public {
    collection(id: $collectionId) {
      id
      name
      description
      categories
      banner { url __typename }
      logo { url __typename }
      creator { displayName id __typename }
      metrics { items __typename }
      totalSupply
      network
      verified
      instagramUsername
      twitterUsername
      websiteUrl
      discordUsername
      enableInternalRarity
      enableExternalRarity
      enableOfficialRarity
      defaultRarityType
      __typename
    }
    __typename
  }
}
```

### `GetCollectionAssets`

Paginated assets inside a collection — supports `where: AssetsSearch` filter (name/description/price/buyNow/auction/**attributes**/chains).

```graphql
fragment AssetBaseDetail on Asset {
  id
  name
  copies
  copiesInCirculation
  main { url __typename }
  cover { url __typename }
  primaryListingsCount
  secondaryListingsCount
  isCurated
  isSoulbound
  isExternalNft
  __typename
}

fragment AssetListing on Listing {
  id
  editionId
  priceDecimal
  auctionMinPriceDecimal
  auctionCloseAt
  mode
  salePriceDecimalUSD
  auctionHasBids
  currency
  source
  seller { id uuid __typename }
  __typename
}

fragment DefaultListingV2WithFilter on Asset {
  defaultListingV2(where: $where, listingTypes: $listingTypes, sort: $sort) {
    ...AssetListing
    __typename
  }
  __typename
}

query GetCollectionAssets($collectionId: ID, $first: Int!, $skip: Int!, $cacheId: ID, $where: AssetsSearch, $sort: [SingleFieldSort!], $listingTypes: [ListingType!]) {
  public(cacheId: $cacheId) {
    assets(
      collectionId: $collectionId
      first: $first
      skip: $skip
      where: $where
      sort: $sort
      listingTypes: $listingTypes
    ) {
      ...AssetBaseDetail
      drop { id __typename }
      royaltiesRateDecimal
      primarySalesCount
      totalSalesDecimal
      ...DefaultListingV2WithFilter
      rarityScore
      defaultRarityRank
      externalRarityScore
      externalRarityRank
      offerableEditionId
      isOwnerExternal
      externalNftMetadata { network isSuspicious __typename }
      latestPurchasedEdition { id priceUSD __typename }
      __typename
    }
    __typename
  }
}
```

### `GetCollectionMetric`

Live metrics: floor, owners, volume, listings, etc.

```graphql
query GetCollectionMetric($collectionId: ID!) {
  public {
    collectionMetric(id: $collectionId) {
      minAuctionListingPriceDecimal
      minSaleListingPriceDecimal
      owners
      totalSalesDecimal
      statisticSource
      totalSalesCount
      totalSupply
      __typename
    }
    __typename
  }
}
```

### `GetAggregatedAttributeSummary`

Trait map: every trait → values → counts (used for trait filter UI & rarity).

```graphql
query GetAggregatedAttributeSummary($collectionId: ID!) {
  public {
    __typename
    aggregatedAttributeSummary(id: $collectionId) {
      count
      displayType
      traitType
      max
      min
      __typename
    }
  }
}
```

### `GetAggregatedAttributeOptions`

🆕 Lazy-load values for ONE specific trait (e.g. all values of `Eyes`).

```graphql
query GetAggregatedAttributeOptions($collectionId: ID!, $traitType: String!) {
  public {
    aggregatedAttributeOptions(id: $collectionId, traitType: $traitType) {
      id
      traitType
      total
      value
      __typename
    }
    __typename
  }
}
```

### `getCollectionPriceHistory`

Time-series of floor / avg price (chart).

```graphql
query getCollectionPriceHistory($collectionId: ID!, $startAt: DateTime) {
  public {
    collection(id: $collectionId) {
      priceHistory(startAt: $startAt) {
        averagePriceDecimal
        bucket
        ordersCount
        volumeDecimal
        isIncludesExternalSource
        __typename
      }
      __typename
    }
    __typename
  }
}
```

### `getCollectionEventHistory`

Activity feed: sales, listings, transfers, mints (paginated by **cursor `after`**, not skip).

```graphql
query getCollectionEventHistory($collectionId: ID!, $first: Int!, $after: String, $naturesIn: [String!]) {
  public {
    collection(id: $collectionId) {
      id
      eventHistory(first: $first, after: $after, naturesIn: $naturesIn) {
        edges {
          node {
            id
            asset {
              id
              copies
              name
              cover { url __typename }
              kind
              copiesInCirculation
              isExternalNft
              __typename
            }
            edition { index __typename }
            user { id uuid username displayName __typename }
            toUser { id uuid username displayName __typename }
            listing {
              externalUser {
                address
                username
                avatar { url __typename }
                __typename
              }
              currency
              salePriceDecimalUSD
              __typename
            }
            nature
            mode
            amountDecimal
            createdAt
            __typename
          }
          __typename
        }
        pageInfo { endCursor hasNextPage __typename }
        __typename
      }
      __typename
    }
    __typename
  }
}
```

-----

## Asset — Detail

*Per-asset detail page. Note the static/dynamic/non-cache split.*

### `GetAssetStaticById`

Heaviest query — static asset data (creator, collection, media, royalties). Cache for hours.

```graphql
fragment UserData on User {
  uuid
  id
  username
  displayName
  isCreator
  avatar { url __typename }
  isCreationWithdrawalBlocked
  creationWithdrawalBlockExpiredAt
  verified
  __typename
}

fragment AssetStatic on AssetStatic {
  id
  copies
  isCurated
  isSoulbound
  isExternalNft
  collectiblePerPack
  maxItemsPerCheckout
  categories { name __typename }
  creator { ...UserData __typename }
  royaltiesRateDecimal
  isAssetWithdrawableOnChain
  drop {
    id
    startAt
    endAt
    premiumDropConfig { id type startAt endAt __typename }
    creator { ...UserData __typename }
    __typename
  }
  kind
  pack { id primaryListingsCount __typename }
  views
  auctionMaxEndDate
  remark
  collection {
    totalSupply
    enableExternalRarity
    enableInternalRarity
    defaultRarityType
    logo { url __typename }
    id
    name
    verified
    metrics { items minSaleListingPriceDecimal __typename }
    __typename
  }
  denomId
  externalNftMetadata {
    chainCollection { name avatar { url __typename } __typename }
    creator { name avatar { url __typename } __typename }
    network
    creatorAddress
    chainCollectionId
    tokenId
    isSuspicious
    __typename
  }
  crossChainCreator {
    id
    username
    displayName
    avatar { url __typename }
    verified
    __typename
  }
  isOwnerOnly
  isOwnerExternal
  rarityScore
  externalRarityScore
  externalRarityRank
  isCrossChainSelfMint
  __typename
}

query GetAssetStaticById($id: ID!, $checkBurned: Boolean, $cacheId: ID) {
  public(cacheId: $cacheId) {
    assetStatic(id: $id, checkBurned: $checkBurned) {
      ...AssetStatic
      __typename
    }
    __typename
  }
}
```

### `GetAssetDynamicById`

Dynamic part — current listing, price, owner stats. Refresh often.

```graphql
fragment AssetListing on Listing {
  id
  editionId
  priceDecimal
  auctionMinPriceDecimal
  auctionCloseAt
  mode
  salePriceDecimalUSD
  auctionHasBids
  currency
  source
  seller { id uuid __typename }
  __typename
}

query GetAssetDynamicById($id: ID!, $checkBurned: Boolean, $cacheId: ID) {
  public(cacheId: $cacheId) {
    assetDynamic(id: $id, checkBurned: $checkBurned) {
      name
      description
      main { url __typename }
      cover { url __typename }
      copiesInCirculation
      primaryListingsCount
      primarySalesCount
      secondaryListingsCount
      defaultEditionId
      defaultAuctionListing { ...AssetListing __typename }
      defaultSaleListing { ...AssetListing __typename }
      defaultSecondaryAuctionListing { ...AssetListing __typename }
      defaultSecondarySaleListing { ...AssetListing __typename }
      defaultPrimaryListing {
        ...AssetListing
        primary
        source
        externalUser {
          address
          username
          avatar { url __typename }
          __typename
        }
        __typename
      }
      defaultRarityRank
      __typename
    }
    __typename
  }
}
```

### `GetAssetNonCacheById`

Non-cached fields — fresh / consistency-critical (liked-by, view counter).

```graphql
query GetAssetNonCacheById($id: ID!, $checkBurned: Boolean, $cacheId: ID) {
  public(cacheId: $cacheId) {
    assetNonCache(id: $id, checkBurned: $checkBurned) {
      isLiked
      likes
      __typename
    }
    __typename
  }
}
```

### `getAssetAttributes`

Just the attributes/traits of an asset.

```graphql
query getAssetAttributes($id: ID!) {
  assetAttributes(id: $id) {
    traitType
    displayType
    value
    percentage
    __typename
  }
}
```

### `getEditionByAssetId`

One specific edition by index of a multi-edition asset.

```graphql
query getEditionByAssetId($editionId: ID, $assetId: ID, $editionIndex: Int, $cacheId: ID) {
  public(cacheId: $cacheId) {
    edition(id: $editionId, assetId: $assetId, editionIndex: $editionIndex) {
      id
      assetId
      index
      listing {
        id
        price
        currency
        primary
        auctionCloseAt
        auctionHasBids
        auctionMinPriceDecimal
        auctionReservePriceDecimal
        expiredAt
        priceDecimal
        mode
        isCancellable
        status
        source
        salePriceDecimalUSD
        externalUser {
          address
          username
          avatar { url __typename }
          __typename
        }
        seller { uuid __typename }
        __typename
      }
      primaryListing {
        id
        price
        currency
        primary
        auctionCloseAt
        auctionHasBids
        auctionMinPriceDecimal
        expiredAt
        priceDecimal
        mode
        isCancellable
        status
        source
        salePriceDecimalUSD
        externalUser {
          address
          username
          avatar { url __typename }
          __typename
        }
        seller { uuid __typename }
        __typename
      }
      owner {
        uuid
        id
        username
        displayName
        avatar { url __typename }
        croWalletAddress
        isCreator
        verified
        __typename
      }
      ownership { primary __typename }
      chainMintStatus
      chainTransferStatus
      chainWithdrawStatus
      acceptedOffer { id user { id __typename } __typename }
      minOfferAmountDecimal
      mintTime
      __typename
    }
    __typename
  }
}
```

### `getEditionsByAssetId`

Paginated list of editions of an asset.

```graphql
fragment UserData on User {
  uuid
  id
  username
  displayName
  isCreator
  avatar { url __typename }
  isCreationWithdrawalBlocked
  creationWithdrawalBlockExpiredAt
  verified
  __typename
}

query getEditionsByAssetId($assetId: ID!, $first: Int, $skip: Int, $ownerId: ID, $primary: Boolean, $hasListing: Boolean, $cacheId: ID, $sort: [SingleFieldSort!], $mode: String, $editionIndex: String, $isDropLast: Boolean, $excludeOwnerId: ID) {
  public(cacheId: $cacheId) {
    editions(
      assetId: $assetId
      primary: $primary
      hasListing: $hasListing
      ownerId: $ownerId
      first: $first
      skip: $skip
      sort: $sort
      mode: $mode
      editionIndex: $editionIndex
      isDropLast: $isDropLast
      excludeOwnerId: $excludeOwnerId
    ) {
      totalCount
      editions {
        id
        index
        listing {
          id
          price
          currency
          primary
          auctionCloseAt
          auctionMinPriceDecimal
          auctionHasBids
          priceDecimal
          mode
          salePriceDecimalUSD
          source
          seller { uuid __typename }
          __typename
        }
        owner { ...UserData __typename }
        ownership { primary __typename }
        acceptedOffer { id __typename }
        chainMintStatus
        chainTransferStatus
        chainWithdrawStatus
        __typename
      }
      __typename
    }
    __typename
  }
}
```

### `EditionEvents`

Activity timeline of one specific edition (mint, transfers, sales).

```graphql
query EditionEvents($editionId: ID!, $cacheId: ID) {
  public(cacheId: $cacheId) {
    editionEvents(editionId: $editionId) {
      id
      createdAt
      nature
      network
      transactionHash
      chainEventHash
      edition { id __typename }
      listing { priceDecimal currency salePriceDecimalUSD __typename }
      user { ...UserData __typename }
      toUser { ...UserData __typename }
      priceUSD
      __typename
    }
    __typename
  }
}

fragment UserData on User {
  uuid
  id
  username
  displayName
  isCreator
  avatar { url __typename }
  isCreationWithdrawalBlocked
  creationWithdrawalBlockExpiredAt
  verified
  __typename
}
```

### `getOfferEvents`

Offers timeline for one specific edition.

```graphql
query getOfferEvents($editionId: ID!) {
  public {
    offerEvents(editionId: $editionId, first: 100) {
      id
      nature
      createdAt
      offer { amountDecimal __typename }
      user { ...UserData __typename }
      __typename
    }
    __typename
  }
}

fragment UserData on User {
  uuid
  id
  username
  displayName
  isCreator
  avatar { url __typename }
  isCreationWithdrawalBlocked
  creationWithdrawalBlockExpiredAt
  verified
  __typename
}
```

### `increaseAssetViews`

MUTATION — bumps the asset view counter on crypto.com. ⚠️ **Don't call** unless you really mean to inflate their public counter.

```graphql
mutation increaseAssetViews($assetId: ID!) {
  increaseAssetViews(assetId: $assetId) {
    id
    views
    __typename
  }
}
```

-----

## Profile / User

*Per-user profile page queries.*

### `User`

Public user profile (avatar, bio, social links, verified, badges).

```graphql
query User($id: ID!, $cacheId: ID) {
  public(cacheId: $cacheId) {
    user(id: $id) {
      uuid
      verified
      id
      username
      bio
      displayName
      instagramUsername
      facebookUsername
      twitterUsername
      isCreator
      canCreateAsset
      croWalletAddress
      avatar { url __typename }
      cover { url __typename }
      __typename
    }
    __typename
  }
}
```

### `UserMetrics`

🆕 User stats: total likes received, views, # created, # minted.

```graphql
query UserMetrics($id: ID!) {
  userMetrics(id: $id) {
    likes
    views
    created
    minted
    __typename
  }
}
```

### `GetProfileAssetsTotal`

Total counts of assets owned/created/liked (for tab counters).

```graphql
query GetProfileAssetsTotal($cacheId: ID, $userId: ID!) {
  public(cacheId: $cacheId) {
    collectedEditionsTotal(ownerId: $userId)
    profileCreatedAssetsTotal(creatorId: $userId)
    profileLikedAssetsTotal(likedById: $userId)
    __typename
  }
}
```

### `GetProfileCollections`

Collections that a user is involved in (owner / creator / liker).

```graphql
query GetProfileCollections($cacheId: ID, $search: String, $first: Int, $skip: Int, $sort: SingleFieldSort, $networks: [SupportedNetwork!], $withStats: Boolean!, $collectionIds: [ID!], $isSortFieldZeroLast: Boolean!, $verifiedOnly: Boolean, $verifiedFirst: Boolean, $creatorId: ID, $assetOwnerId: ID, $assetCreatorId: ID, $assetLikedById: ID) {
  public(cacheId: $cacheId) {
    profileCollections(
      search: $search
      first: $first
      skip: $skip
      sort: $sort
      networks: $networks
      collectionIds: $collectionIds
      isSortFieldZeroLast: $isSortFieldZeroLast
      verifiedOnly: $verifiedOnly
      verifiedFirst: $verifiedFirst
      creatorId: $creatorId
      assetOwnerId: $assetOwnerId
      assetCreatorId: $assetCreatorId
      assetLikedById: $assetLikedById
    ) {
      id
      name
      logo { url __typename }
      banner { url __typename }
      verified
      stats @include(if: $withStats) {
        floorPriceDecimal
        oneDayFloorPriceDecimalChange
        oneDayVolumeDecimal
        oneDayVolumeDecimalChange
        sevenDayFloorPriceDecimalChange
        sevenDayVolumeDecimal
        sevenDayVolumeDecimalChange
        thirtyDayFloorPriceDecimalChange
        thirtyDayVolumeDecimal
        thirtyDayVolumeDecimalChange
        __typename
      }
      __typename
    }
    __typename
  }
}
```

### `GetProfileAssets`

Assets owned/created/liked by a user. Three exclusive variables: `ownerId`, `creatorId`, `likedById`.

```graphql
fragment AssetBaseDetail on Asset {
  id
  name
  copies
  copiesInCirculation
  main { url __typename }
  cover { url __typename }
  primaryListingsCount
  secondaryListingsCount
  isCurated
  isSoulbound
  isExternalNft
  __typename
}

query GetProfileAssets($first: Int!, $skip: Int!, $cacheId: ID, $creatorId: ID, $ownerId: ID, $likedById: ID, $categories: [ID!], $listingTypes: [ListingType!], $collections: [ID!], $curation: [Curation!], $where: AssetsSearch, $sort: [SingleFieldSort!]) {
  public(cacheId: $cacheId) {
    profileAssets(
      first: $first
      skip: $skip
      creatorId: $creatorId
      ownerId: $ownerId
      likedById: $likedById
      categories: $categories
      listingTypes: $listingTypes
      collections: $collections
      curation: $curation
      where: $where
      sort: $sort
    ) {
      ...AssetBaseDetail
      drop { id __typename }
      primarySalesCount
      totalSalesDecimal
      collection {
        metrics { items __typename }
        logo { url __typename }
        id
        name
        verified
        enableInternalRarity
        enableExternalRarity
        __typename
      }
      rarityScore
      rarityRank
      externalRarityScore
      externalRarityRank
      defaultEditionId
      externalNftMetadata { network isSuspicious __typename }
      ownerEditionsTotal
      latestPurchasedEdition { id priceUSD __typename }
      __typename
    }
    __typename
  }
}
```

-----

## Search

*Top-bar search / autocomplete.*

### `getSearchPreviewResults`

Mixed preview (collections + users + featured assets).

```graphql
query getSearchPreviewResults($keyWord: String!) {
  public {
    dropDown(keyWord: $keyWord) {
      collectibles {
        id
        cover { url __typename }
        name
        externalNftMetadata { network isSuspicious __typename }
        copies
        copiesInCirculation
        defaultEditionId
        primaryListingsCount
        secondaryListingsCount
        kind
        isCurated
        defaultListingV2 { editionId __typename }
        __typename
      }
      collections {
        id
        logo { url __typename }
        name
        verified
        metrics { items __typename }
        __typename
      }
      users {
        avatar { url __typename }
        displayName
        username
        verified
        __typename
      }
      __typename
    }
    __typename
  }
}
```

### `getSearchPreviewResultsAssetTotal`

Total asset count for a keyword.

```graphql
query getSearchPreviewResultsAssetTotal($cacheId: ID, $keyword: String!) {
  public(cacheId: $cacheId) {
    searchPreviewResultsAssetTotal(keyword: $keyword)
    __typename
  }
}
```

-----

## 🚀 Strategic recommendations for CRONOS.WTF (updated)

### Tier 0 — Bootstrap

Call **`getPublicSharedConfigs` once at app boot** and cache the result. It gives you the live list of categories, networks, top filter ranges/metrics. Use it to drive every dropdown/filter UI dynamically — never hardcode enums again.

### Tier 1 — Big visible features that don't exist yet

1. **Native asset detail page** (currently a redirect to crypto.com):
   - `GetAssetStaticById` (cache 1h+) + `GetAssetDynamicById` (refresh on focus) + `getAssetAttributes`
   - Editions table: `getEditionsByAssetId` (paginated)
   - Activity tab: `EditionEvents` + `getOfferEvents`
   - Don't forget to skip `increaseAssetViews` ⚠️
2. **Native marketplace browse** with the full `GetMarketplaceAssets` query:
   - All filters (curation, listing types, categories, network/chain, price range)
   - Multi-sort just like the official site
   - Pagination + virtualized grid
3. **Native collection detail page**:
   - Header: `GetCollection` + `GetCollectionMetric`
   - Floor chart (Recharts): `getCollectionPriceHistory`
   - Activity tab with filters: `getCollectionEventHistory` + nature buttons (listed/sold/transferred/bid_made…)
   - Trait filter sidebar: `GetAggregatedAttributeSummary` upfront, lazy-load each trait's values via `GetAggregatedAttributeOptions` on click
   - Items grid: `GetCollectionAssets` with `where.attributes` to apply trait filters
4. **Drops section** (live + ended):
   - `LiveAndUpcomingDrops` + `EndedDrops` + `Drop` + `GetDropAssetsQuery`
   - Bulk status refresh: `getDropStatuses` polled every 30s for live drops
5. **Top Collectibles + Top Creators leaderboards** on homepage:
   - `GetTopCollectibles` (with VOLUME/LIKE/VIEW × 1D/7D/30D/ALL toggles)
   - `GetTopCreators` for the creator leaderboard
   - `DiscoverPageTopCollections` for a hero strip

### Tier 2 — Quality of life

1. **Smart trait filters** — `GetAggregatedAttributeOptions` is the lazy-load pattern (only fetches values for the trait the user expands → much faster than the all-in-one summary).
2. **Live activity ticker** at top of homepage — poll `getCollectionEventHistory` on top 5 collections, show a rolling feed.
3. **User metrics card** on profile pages — `UserMetrics` gives likes/views/created/minted in one cheap call.
4. **Top nav dropdown** with collection shortcuts — `NavTopCollections` is super lightweight (just id + name).

### Tier 3 — Backend hygiene

1. **Reuse `cacheId` patterns**: send the same `cacheId` strings as the official client when possible — you hit the same edge cache → near-instant response. The pattern is `<queryName>-<sha1OfVariables>` or a semantic key. Without `cacheId` you bypass the cache entirely.
2. **Static/dynamic split for assets** — replicate the official 3-query pattern (`Static` / `Dynamic` / `NonCache`) and cache each layer differently (1h / 1min / no-cache).
3. **Don't call `increaseAssetViews`** unless you want to bump the public counter on crypto.com itself.
4. **Throttle `getDropStatuses`** — official client batches up to ~13 drop IDs per call, then polls every ~30s.
