$ids = 528230..528250
foreach ($id in $ids) {
  try {
    $resp = Invoke-WebRequest -Uri ("https://www.tcgplayer.com/product/" + $id) -UseBasicParsing -ErrorAction Stop -Headers @{ "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    $title = $resp.ParsedHtml.title
    if (![string]::IsNullOrWhiteSpace($title)) {
      Write-Output ("{0}`t{1}" -f $id, $title)
    }
  } catch {
    # ignore
  }
}
