# Kinmen KML metadata mirrors

這三份 KML 是可提交的 metadata-only mirrors，用來讓 `HistoricalAerialKmlParser`、`HistoricalAerialDatasetRegistry` 與 GPT review 有可重現的文字輸入：

- `kinmen-1944.kml`
- `kinmen-1945.kml`
- `kinmen-1958.kml`

`Icon` 保留 1×1 GIF placeholder；實際 tile template 只記錄官方 `gx:MapTilePyramid/Link`，不把 Icon 當作航照像素。下載 tile、mosaic、smart composite 與含 rights-unclear pixels 的 screenshots 維持 local-only。
