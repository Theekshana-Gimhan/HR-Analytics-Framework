# Update the dissertation's Word fields and export it to PDF.
#
# WHY THIS EXISTS
# ---------------
# build_dissertation.py writes TOC and PAGE as Word *fields*. python-docx
# cannot compute them -- only Word can -- so a freshly built .docx has an empty
# table of contents until someone presses Ctrl+A then F9. That step was being
# done by hand and silently lost on every rebuild, which meant the PDF could be
# exported with an empty contents page and nobody would notice.
#
# This drives Word itself: update every field, save the .docx so the built file
# carries the populated TOC, then export a PDF. Word's own PDF export is used
# rather than LibreOffice, because only Word renders its own field results and
# TNR metrics exactly as the submitted .docx will look.
#
# Run:  powershell -ExecutionPolicy Bypass -File scripts\export_pdf.ps1
#
# ASCII only, on purpose: Windows PowerShell reads .ps1 as ANSI.

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$docx = Join-Path $root 'created_docs\Final_Report_COM4901_Theekshana_Gimhan.docx'
$pdf  = Join-Path $root 'created_docs\Final_Report_COM4901_Theekshana_Gimhan.pdf'

if (-not (Test-Path $docx)) {
    throw "Not found: $docx  (run: python scripts/build_dissertation.py)"
}

# A ~$ owner file means Word still has it open. Exporting anyway would either
# fail or silently export a stale copy, so stop and say so.
$lock = Join-Path $root 'created_docs\~$nal_Report_COM4901_Theekshana_Gimhan.docx'
if (Test-Path $lock) {
    throw "The document is still open in Word. Close it, then re-run this script."
}

Write-Host "Opening Word..."
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    $doc = $word.Documents.Open($docx, $false, $false)

    Write-Host "Updating fields..."
    # Body fields first, then each table of contents, then headers and footers
    # (the page-number field lives in the footer and is missed by Fields.Update).
    $null = $doc.Fields.Update()
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    foreach ($sec in $doc.Sections) {
        foreach ($f in $sec.Footers) { $null = $f.Range.Fields.Update() }
        foreach ($h in $sec.Headers) { $null = $h.Range.Fields.Update() }
    }
    # Repaginate so PAGEREF targets settle before the TOC is read back.
    $doc.Repaginate()
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }

    $entries = 0
    foreach ($toc in $doc.TablesOfContents) {
        $entries += ($toc.Range.Paragraphs.Count)
    }
    Write-Host "  table-of-contents entries: $entries"
    if ($entries -lt 5) {
        throw "The table of contents did not populate ($entries entries). Not exporting."
    }

    $doc.Save()
    Write-Host "Exporting PDF..."
    # 17 = wdExportFormatPDF, 0 = wdExportOptimizeForPrint
    $doc.ExportAsFixedFormat($pdf, 17, $false, 0)

    $pages = $doc.ComputeStatistics(2)   # 2 = wdStatisticPages
    Write-Host ("  pages: {0}" -f $pages)

    $doc.Close($false)
}
finally {
    # Word often shuts itself down once its last document closes, which leaves
    # this RPC channel dead. Quitting an already-gone Word is not a failure, and
    # letting it throw here would mask a successful export behind exit code 1.
    try { $word.Quit() } catch { }
    try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null } catch { }
}

Write-Host ""
Write-Host "Wrote $pdf"
