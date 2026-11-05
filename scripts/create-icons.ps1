Add-Type -AssemblyName System.Drawing
$assetFolder = Join-Path $PSScriptRoot '..\src\assets'
[System.IO.Directory]::CreateDirectory($assetFolder) | Out-Null
$frames = @()
foreach ($size in @(16, 24, 32, 48, 64, 128, 256)) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 31, 137, 240))
    $graphics.FillEllipse($brush, 0, 0, $size - 1, $size - 1)
    $font = [System.Drawing.Font]::new('Segoe UI', [single]($size * 0.43), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rectangle = [System.Drawing.RectangleF]::new(0, [single](-$size * 0.025), $size, $size)
    $graphics.DrawString('RU', $font, [System.Drawing.Brushes]::White, $rectangle, $format)
    $stream = [System.IO.MemoryStream]::new()
    $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
    $frames += ,@{Size = $size; Bytes = $stream.ToArray()}
    if ($size -eq 32) { $bitmap.Save((Join-Path $assetFolder 'tray.png'), [System.Drawing.Imaging.ImageFormat]::Png) }
    if ($size -eq 256) { $bitmap.Save((Join-Path $assetFolder 'k4-wheel.png'), [System.Drawing.Imaging.ImageFormat]::Png) }
    $stream.Dispose(); $format.Dispose(); $font.Dispose(); $brush.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
$output = [System.IO.File]::Create((Join-Path $assetFolder 'k4-wheel.ico'))
$writer = [System.IO.BinaryWriter]::new($output)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$frames.Count)
$offset = 6 + 16 * $frames.Count
foreach ($frame in $frames) {
    $dimension = if ($frame.Size -eq 256) { 0 } else { $frame.Size }
    $writer.Write([byte]$dimension); $writer.Write([byte]$dimension); $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$frame.Bytes.Length); $writer.Write([uint32]$offset)
    $offset += $frame.Bytes.Length
}
foreach ($frame in $frames) { $writer.Write([byte[]]$frame.Bytes) }
$writer.Dispose(); $output.Dispose()

