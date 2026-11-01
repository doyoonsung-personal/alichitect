# Rescue check: 5 runs

| run | cut after lines (cut at ms) | Qwen ops before cut | Claude ops | rescue | cut -> first Claude op ms | Claude call ms | turn ms | Claude cost | final nodes / edges | errors | partial nodes kept | pass |
| --- | --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | --- | ---: | --- | --- |
| pat-04-rag#1 | 4 (4047) | 4 | 23 | continue ok | 4719 (rescue starts at 4065) | 13077 | 17142 | $0.0372 | 9 / 8 | 0 | 0/0 | NO |
| pat-02-k8s#1 | 6 (4583) | 6 | 23 | continue ok | 1747 (rescue starts at 4587) | 9757 | 14346 | $0.0329 | 10 / 10 | 0 | 1/1 | NO |
| pat-01-web-ha#1 | 9 (6023) | 9 | 24 | continue ok | 1550 (rescue starts at 6028) | 9962 | 15992 | $0.0325 | 12 / 9 | 0 | 2/2 | yes |
| pat-05-data-platform#1 | 14 (9811) | 14 | 15 | continue ok | 4045 (rescue starts at 9816) | 9819 | 19637 | $0.0333 | 9 / 9 | 0 | 5/5 | NO |
| pat-12-ecommerce-security#1 | 20 (11922) | 20 | 6 | continue ok | 2443 (rescue starts at 11925) | 4619 | 16545 | $0.0204 | 9 / 6 | 0 | 7/7 | NO |

Failed assertions:
- pat-04-rag#1 format: bad 1, done false, finish null, cut off and rescued by the continuation turn
- pat-02-k8s#1 format: bad 1, done false, finish null, cut off and rescued by the continuation turn
- pat-05-data-platform#1 format: bad 1, done false, finish null, cut off and rescued by the continuation turn
- pat-12-ecommerce-security#1 format: bad 1, done false, finish null, cut off and rescued by the continuation turn
