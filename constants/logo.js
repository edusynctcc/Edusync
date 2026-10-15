// ---------------------------------------------------------------------------
// A LOGO DO EDUSYNC, EMBUTIDA
//
// Por que base64 num arquivo em vez de `require("../assets/logo.png")`:
//
// 1. O expo-print NAO espera imagem carregar — o imprimirHtml manda imprimir
//    depois de um setTimeout fixo de 450ms. Foi assim que a figura da questao
//    saiu em branco na primeira versao. Embutida, ela ja esta la.
// 2. No celular, o require de uma imagem devolve um NUMERO (o id do modulo),
//    nao um caminho. Nao existe `src` que aceite isso: seria preciso
//    expo-asset mais expo-file-system, duas dependencias e duas chamadas
//    assincronas a mais no caminho de imprimir — e na web esse mesmo codigo
//    nao serve, porque o readAsStringAsync nao existe la.
//
// A logo nao muda, entao converter uma vez e o caminho mais curto e o que
// menos pode falhar. O custo e a imagem existir duas vezes no repositorio.
//
// Esta e a versao vertical: simbolo em cima, EDUSYNC e DESDE 2026 embaixo.
// Diferente da primeira que voce mandou, aqui o "DESDE 2026" e amarelo e nao
// branco — entao ele aparece no papel.
//
// SOBRE O TAMANHO: esta em paleta de 96 cores em vez de RGBA. Fica
// indistinguivel a olho e ocupa um terco do espaco — os degrades do azul sao
// o que fazia o PNG inchar.
//
// A imagem tem 240x300px, o triplo dos 80px de largura que aparecem
// impressos, para ficar nitida em qualquer impressora.
//
// Para trocar a logo: recorte o PNG no conteudo (sem margem sobrando),
// redimensione para ~3x a largura impressa, salve com paleta e substitua a
// string.
// ---------------------------------------------------------------------------

export const LOGO_EDUSYNC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAEsCAMAAADKAM5AAAABIFBMVEUcZJ8RWpz12WAIXKAUmNocmNcJW58RmNsSmt3/uSsT" +
  "UWwIqKwHCXz/AAD9/Pn/fwD/f3/62jpWbJz376hdmKr20VD82Dxrbnf81T360juvr2AMecMPe8MZecxTqtKpq6sKfMYLOqso" +
  "wvne2laq9PRpwa+/vz+12ZuPyZEWCip/fwB/f/9RvMlj3/GqVVWz0XD0v3QGP39vPz/81lVav7l//3+/Pz+/fz+qVaqqqv+/" +
  "/3//qqr/qv8AAAAGc7kQl9v+2EsYp+YLh88GarEHesMjtu8AVan//wD/4kwAf38AAP8SnOH51U7//n7510/91UUA/////1X8" +
  "1kcBPn4bs/IAf/8KWJn81Ub/qlUAqf771koMVpcLY6gSV5UPV5YQZKkVNFrIAAAAYHRSTlMeYhjWXiOXndEDCgMDAQICAhkJ" +
  "Bgta8ASkXAOiYRoPA88F/+sD/QQL/QcCAvsHA/kITgaK/QIEBAMDBAMDAP39+v39+/39AwH+AgH9UQIvzwEDsQT9ArGRAwNv" +
  "j85NcLZgcPxiAAAgtElEQVR42u2dB2PiOL7AjU3v6WVuZnZv7/Z6f/09ERITjB0bTK8h3/9bPBXLluSCSQwhWbQ7Mxkwsn76" +
  "d0lmJJBo05xfh9ukRHurA/MnE1i/GGALdJud5klF+6UA98Gi0+ws4J+/EGCtOoDAA/BLkbAG5CZqMrTlXwQw1ujmget0gsAV" +
  "Te5h4J6l/SKA+8BskmYesIiTA9ZmZ1jATeS2+trnBz4hFtwkVnzy6YFPYNLhtS4oaJ8auFpwQlLTNePK7PMC16GPMpt8W5wB" +
  "7RAt+e3AFsKSpwIvDE4mfHPWr38yYBxyu9Nmp+kjbg5MGXlv7TMBI+EuBgG4GLnTm2LmzwOsgS6kDcZ1mJtT+aDKxTcBV4Hc" +
  "i6B1mKfg0wBbXOwNA74Gs8+j0mfTTrSIO81rWdM+kQ1XzTCXhWl70+7nSzzkRS+Q2YlLFe1zAfdrAJwFiBm6ZyTc2ezzSRgl" +
  "ljA88cSdAcStHWBumUgurc2gMS/4VLoKZpbvOqd9hvIQIrPlwwJOgktp9QuFvlbTOPKf+++zEJRYPaydMMQLVA5r2qw/m9XY" +
  "uC2jdlZ1P9O3PvCKBzgBU3eJp6D16bLWmdw1F4vFdDDouW0wGCzMLi4tZh8X2NLoGkC3giUny+a/ICZOqWmjKTb+abBAnu3D" +
  "AsMMEosY5pJ9IJvTXlPAdAuKjldaDMwPKGFkrJpWAX2NWPGNJoMFwkK6O4XqvDDNrtNMqN43016v6RRZMFxbe3XbbwWGLrjv" +
  "JZp0q8UC8kUXuqfw7KyLNIAucVofBFizSGJRlU3ok2RQr+DNtJ4MKvSSSm1WgDGpP7NIm81giHIWNM9o5JZB9QMA10nSSETV" +
  "+alzCeVaQEZMdg+12cyqa1FzBbEdr77XzbfXAdexaM+6C+KZYFF0gWJMH1x3UBCOtdFSoWGst9clkVcAW32ksdQNQ1iza1E3" +
  "bV52LruxBAbVgbi4jrnXBQJpa1r0e3cxIG4WRlLsmWb9PxK3ZcIaSYtjEAAs6ArQXtOtrYDJyjqidUSLlyQLTFYc7xQPlC5a" +
  "/SO81Zp2oMBYuJQWivaWZMP8cG/l242zBtyV7A6qMvZbQ8QGvq0hu3Vpce3vK3ftEvrNjiokGVxcNO+7WIwJDKs/OEzkpZo9" +
  "hzagujMA+Jb5toHWXRHqXC7A/nfOYwEjtq4jXGS3WiHQz9jgPDcaPebOg2RMIpmMhOvklAv5PU7txQBGFRzRZbIGGVbEGjrk" +
  "fXx8HOXA2CdaL5I5mzAI9z0ORmwGthyPSsaIVnNC2hykEe/j430G2CwsLgC7Jopk7HJm/zBXPGZoK7TjaGDU5qcBSvlH0nIQ" +
  "nlZRgIjW3YJy9eSdVrakjbxdtH2EFyGjx+gK+PEx/w1c0SrqxKRJCi2AZfCeW+UbgOv4uCjkPdt4aGMOco+0ZWgVNb12YdGf" +
  "1zdyhBM4AGBLw7wwvweFjV3VqEaPRmlYWOCCl4FtXuPE7L3XqjcAA7y+jlbl+qHFnoYWYvvy7Ns9RIVhKf9vv//pusev5PQI" +
  "7QGc+ogE1tyjOSZJCvuzGS3lYS0PW7/fd0Wfyef//Nvf/+2n5uWlt/ECYS+vF90DoY0P7JZFQQ0txELXhDT4Ulysu16cOBXG" +
  "gey6RKt0DQw8I+wNpgvzpiuT1u2e3NyYi+n1NV2IFfbS4PU3WLLQbCM3GQzb1nX7QIA19kxDx7/57V+EhQp9efnTT9dm93fE" +
  "DMIzFdsuSfOSk5WNSwcRlqBSR2x4N4NQ//b73/75MU1gb8NgjfF8TvNP6y+Z+TwDxHz0nRKPGq2SOhEnddC7l5eQFKJiR/2Y" +
  "/93PVgQskea3TCady+Xy+XvYcpnIunJ/qSWqV+XuQtgxYTYUetfXU2jN8u/yhBW1X4/YdJpT4znOOr9n0ukcBqVtdJ/ei5Bj" +
  "VEu3M5I2oT2x6XQ6QA3+eXOzMM2TE5mePMuMfu1mWo/BwDYW7W1GYKUtdwrsQwDGFY8WpQOFfv/2j99GHu/jr9O+ng3snhDs" +
  "031Ig2o9P5glHq1uzQqFfqGgabUaZNTQLvfMovvcJShhFjgnDN2YE9r7qDbKZxJ+VO7ty7QxaiUHWNTO8w20xJB3TrwrYFgh" +
  "2myt/C2dv4/V0jvW6h0BI6/luVzb+JYb3d/HJR7bHxD4kfNadil9fx+f2NY/HjA0Yj5XzMTVaeisr3YYkHcGDB2uwS3hQuTY" +
  "xBlQ+nAqLaYeNvRFmVx8YunDAfvcLUKOq9e7C8g7Aw6IxEAfg0xM4ic4X/aHAn7MB6XTGZDewlmPDxhYSC2JEZcCLsvFDk+5" +
  "77vIQZICHvuAHwNyJh1knuIHZOSs7UMFhij3AnD+T3aA4t9v0fJpkHjBmBSw7Qfmskt6Uf5+q5bjo/lBAUt5EdhXE8cUcJ4v" +
  "GO2DBDZAUQR+9AWmcSyXlfauGt3nS8ZhAkPinAh8L+g02lCNAQxzjjyprfK5tHSoKs1tHobo9DiWj85nbKL5uUzmgOMw7MgH" +
  "LOp0KY4Jj/LQIZznncxjbhwssD/V8ul0LJ81ygFDgn3BH3TpkCXsBx6JBURc4DnUfaLbxgEDl4RAPHq8H42gjzW2BUaGb1eR" +
  "20qDzAEDj8XMY0QWIefbhmGkFXOs0/DTGd2AlpxkgplgWJK8Iw+wUf0c80oQJyqNcd5Gso7DlTAKxCMKzK4zj7cpHaAV/AX2" +
  "ZIOveawh6cw5KGXSCSaYyQHPEfAIaeKIs0iuZMpvBCY6gTpzwjLaXExwsVpKUFfSo1HA5gmTGkpRqeVohG2BJCueuY+IMduH" +
  "BzwOtlBWOO0InXaMwSkWUF01YiJV6QBtGFXEo4Cwyh7fICmU/yL/0l/J1WmkJQlulSeYzNiV/CjQ65aiAxNUZWYhzGErudM3" +
  "us8kuS6fIDAjFD5zYoY7/pN4zeieLzdsV2Fyj9QoklyVl5LsKh0SWEvhhi5WG3MukUHxPOHtxASB9WCvxYvY5mbFV10x1dEY" +
  "X5lPJ7zrkiCwAc4DjZgPKsiMR2G8nHOCE5jOSEnvqyVZgYUtOud8ReIogBfZry0EOtzp4QKHFQdPvFqW0Kaae8LJ9c8BG+H6" +
  "nC0bDH08LkmozXFDP5XG47H+bsDQz9wFr9p8HRscMUgjZEa6+bQUmkwZ9nguzaOOBYzn8fehkgRGBVOsgxu6Tc4v4cQRZsu5" +
  "9Ndg3YWoc/f1b5lMJo1azmnoZ/haxtP/PQOjlD90YY4XQQnpIQZwBuwXkV1yXvvN1wyGzN/d3YmZ6R1qcMIiFGSXwCWQDsmV" +
  "c75gOp57MpmXDNF4ybjwYUwI6vgCt0Fy2py3oAvQ9w9sAynYiO/vgtJDpLDQLQmiMcYSfoWwsqR3T3duI39/cv8IvsOugSO2" +
  "FnKlWCtyUI8pLFZfR5p3XHsixHdPnpwhccyMLFlgNzCRwRLZ3KP/4ozHwLTfIK0D6+H5G5qIuyd6DbxL7j2AbRyYyIw/cW2z" +
  "yo3xacwMVuOnp6cQTlHMFPidVJrotI8Wqd997lspXKlt5MLOKe1d7EbcF/QR+VRMN50wMNTpu3syDGJ65NcGIyPCTWPau20a" +
  "hn1Ccen0XcKSs+V95/pToneEOFTp2gb2UlvKFusxgc28W+KBl61y908B7gX+jzJMnxjIOWp0aPxpS+ES2K+kk3bsZdykgUvg" +
  "a6hf9TtSjIuFe7elKt895NJSmWQtW1UPiW/Q2Vf5sNHf3/FmjHAlhLutKj/gnfLtYXcCDNPLCJ/KmnEJ4SJd3lK2ebQsgHPT" +
  "12xHJA6MS6aw4TJVBDTnU3TyclvZpvGzye1X768lv+eMKohwT+OYsd1GB02f7remxWMev2GnKXlgHUgP4cRPeCsFHyW+u98q" +
  "w8jnsCbP37jGtYNTBTDbCidB6z0ZgruVcHO/+poA7a6AI0R8h/KPOtTmp22Ei8Ntu53Enukuzo1EivgO1uq5+LhYuBJaEkho" +
  "e2k3wF8fNlc6cYWLDTe5x1x2ctA+WsTbCnfcTvIwz46ApYe38z7kviYr3N0BwxLiy9tEDHUZCdcoHe5JPD4WG1GOOi5u+5Cf" +
  "efCJ+FdvAMa48908j7cjYNuW8q+Xbgns6Bme3QEjEb9BuiUDgA8GDManr/BbTw87xt0l8Pah6enhC7LdXeLuEBiFplfglnaL" +
  "u0tgQ5d+2Mp4U3CSDuRrLV4r4tTDFsZ7CsY6AB8ZGPadjem3sDa3AfjYwDqQcvG1eW6ADw4MeeMFJiTevWjzboHtuLw/pAAo" +
  "AfDRgW27GMuAH7LSPnzzzoGNcSUbxzkj8bYB+PjAbZB9uHsgDYoR/hxmvW0DfALgH1EIfqANA3vwD+QX/JEVr60bHxe4zfB6" +
  "3Hy7u/vCWG9bB3v6UrxdAMOA1Arj9KT+5Uf35mi/Scqcgg+aadm6pGzkbaWAywcl+6tc/gGmH+0PCYwc1qb2gwQkw71e+oJW" +
  "wGA+vfPvS9sFMDLgTeqMgi+9fg6kvBOxH77uXsbSLgx4E2+KcVBofp7cXRhp58SJA4+vspvN18utxlwNuQdiae8KjcyX1Qcu" +
  "Kdk9ccLAuiE1onkVCQyZ62EGioOyVypKu43HUtICfonmzXISZDMURI1+/dDeqYyl/Sp0lv+6O+PqC5OB3pHff9ipVicKbOhF" +
  "JZqX/0JDvJTLO3D0206JpT0KGLpn/vxNG3wJ9OOQeP4RgHWj3YjmFWpBu/rlLoxY+gDA48icsuVLldE3NIXH6h8PHjg6JEGE" +
  "oW/Zqx2elInqf4DAkUVDw88bDfzAlFOHCRwp4EAVNcDpD7FD9uEBRwk4xCQ3FJJf2jtwXYn1CLPiRnx/FS9P+WEHa3xScgIO" +
  "HXwrG6abRnn1sCFyH+oD0waQVuH5VZicxhuL5+xpwoYsJSfgwKHDF19A+ArsOORjvOs6xJN4Oi6TWhQS/Q4b+nElGfr2E7Uz" +
  "tZYSc1kqRiSULdoQb3Q4jUGcaHySEtToFteIiNWNg91MjCYtsa+NTwjYrrwIvARafd4snBjEjeT23KTENZoTckBCGUQsrTYQ" +
  "t16gZeiHAzyEQgpq2Ti8AHwFUsTKEHYFiQk5GeAyeAnifSnH3BJsg3qqEYpLiJGQE0BOBNgO1uhNDpqrPEBq5YvgD2ynSMjl" +
  "t58WkJLx0c+qnzeOw+IM+aXFSfbB7xJWbxeylIwJrwMUeh3PgD1ikFIFTfYhN7JvRZaSMeFsq9VooCE1GIe15cBgqJWyahgr" +
  "bY1UERjj93ZaRRXyeo0Y8PZnGJCQV61NyCu0FqK/JzA0Pw4YyVmVXrNAY8OuUmoAMumU/oD9tf6ewOsGJ+HGlg6LF3I7q/pw" +
  "+d5bKka23w94KfC2lts5LAFZelFDaSly9pXISQAb1awA/HL6hjVWm0duNBJFTgDYAOUV77NeZ8BMGqJT5EZ4o8j63oFR5cAN" +
  "5dUGzKyExERObY0sJWHCzzzwMoksHyNn1UbSUk4euKWcJnOKECOnVpvEjJH19l6B15xCJ3dmAWGcp17URhSxgxx3qS8R4CzL" +
  "u05yXRV5bCLmaOSXFIip2UkBqyr6H7ZJNdl1ZANhXElZRY3SbIj8HM+YEwAew9IB0qKGFTrxPT9soNJzVo2Sc6uxQi7b0PcC" +
  "3KDACUSkYC0iqg3lTC0H65MqxENkzMYegRvqcmfHUbBqIzkrRNDODbFWYWyVaPamf74nORtG91ak8g7PPNuYuQgFrTKCZpgR" +
  "8moDcSLASzzVu1NolhnfQEoh7Raonb9vGEMiwCmiWztUaFa3x8QXS9IaQTNWrMbJaxMALgNJwXdTpD09qIEEje9UR9TZFYO9" +
  "sXBJojzUwRqZkSKBvT1Qh5fAaNSVpNQzwVaRn96500KR4HmiLPfLS0N0myrwmSQVpb2EJUbS79MMhO3k7+U9JB7YcenGvh8x" +
  "C9BxXd+8ACKBX1g7Ah+Bj8BH4CPwEfgIfAQ+Ah+Bj8BH4CPwEfgIfAQ+Ah+Bj8BH4CPwEfgI/PmA7THaDtrL1zvq6FZFdyN3" +
  "W2CjPXzzgyVjb8e67N+RKkf8zR2FEXe03t6aMdRfLeHyWzbO8FxL0nPqWcI3390mHD7VVnFudYqYiwh4qWRfnLYiDf00wQe8" +
  "dSBNyBsv5OWXl2wqhQ/6sT23wfPK6SHFfTUYfXXtbaWiw9DO5rWqrrLPeEfXu/RllWUlBNarF/IOfghq6fz8wuxFj+lnVy9F" +
  "wI8KSM8v7q1e8LghsNJyHsvgHzr6A+lM8j+QpKrZ1Dm3GzxER9OcZ068qRiCFO2XPfzhnP127qmu1qfkBLLbvfc8Kvuycgr1" +
  "eBXwyEwbPVJDPllmd8Phh5crckyTEDbU7DMCngQdb2sp7h2DDu02VhC5zQOTlmJHklKFA8UG0JbicTp0VMJgD6hOXMMtgwlz" +
  "dAN2QW/DPlPRRvNKTiz96AHDH54V/wHFNZJw4EE+5Q/hwLgpEitLOhI1Gnj8fRlwTDIFhrpRVFrecVznauZpmSXWKPealuL6" +
  "XQTcEIEN45/LIFFNqEpvJWF3nO0tgdHpF//dEDA6g6x6o9Kdu0+8STA44EbDPbTrPlPTWg0psFG+mgQO+uVVKt0Q4WICj4Xn" +
  "m1hg25AUXn25x6EcPA/YO57kWgMD3AbL4DFPWGCVbT6Vpof8+KPg+jbAumfqsDsYDlTsUzBwgIj1qjs0RTJsHhhdVBRVuugA" +
  "M33RoZNzey0WWE0x7flZF4BX+OX1ROXsuGzHBzYYdVHW0rffnEvPS0V1gI2yK2JixcyTBe6hcxaY+i2/hHVOk6BvllBDQ2eB" +
  "W+p5QJLgjrG1olGFdQaObcYDZv6uuPmOtFYdHOZt7KjL1Yn3FIXjt1l/04LTbfASdoE9M1UnXmolTVROwlJbanvNB3wKk8ph" +
  "m3f3jlLHBaYiQ4jQyRr4qKikrKlLmzAPAhVdMTExiHewSzpRPDBr++oSnbW2YcP/ENl6yUpY8v+bxSzwd+elH4Gne44z2Rr4" +
  "2X0KxRgCSQJuFHJFXG/XXTFNqjTJ4YAdv8WoNLFhnXkyMMs+71I0QJWTcCSwUvcKLBekpVw5Kt3YDpj78lJ3QJ5vVZ8NejGb" +
  "evEShkqt+52WDYqKZwv8IwFFEB+YShiTTDj3sjUwtFEw1H2lj86Epqxnh0tvToScAVu/CMzcFk7s0F8PeyrN2LAPuMEBe7q3" +
  "doBjqbQX45ArKfvONeOj5tS3qmLw8wOjcKWLKu3pCfQ7/jpScqW1Oovy0o1VnSliruidoSTK8cNSkXF3S1xz2UKZy4SmoAf7" +
  "6EOdNCGAYabtpeE0DiutiGcCPWB1TQIwaikpErjNTiK8STDwUEw8+PwHxscrsRoWMgZip0ZZBG69rFgHzgHb0Ke2hKQ8UKW5" +
  "TIue9WaAle9sOeh5lGEoMCfhYkCiquInjcYhIg560M1BaWXd+68kD1hFwGxyGHSC25Mw5/CLIjDjpbmX8U1iOK0iCTy8AGGJ" +
  "muKlwGYfZJ45M6SyW3qjXgNewm3Gz1YCF/GCygo1QMJ1dqGprLCxMKaE4UtXvqJN4R/KKF8pEY8iu8C2qwmwjhKAn8Xk8JXA" +
  "31kJDzm1iQ1sgKulWH/zSis8m6tccat4VKVh/rT2QlwY8EvQ4wBxgVsCsMLaTVyVdhYiBCFDKeps35PwZ8094KHr8dXnVJhK" +
  "bwCOdlqr74HRSilvBYw+e77mkfknb9gE010K8Nuw13lrFQ4cqdIqjke4/UOSohIPVu9WMSXcZhcTz58nCl8FMFxjJsEU3azi" +
  "9VcEE9EdBHhpOwo4sjzknBYTUCdVA2wHjFbsUJXJIONg7v+YT8AssA7ECEYmnwV+jk48nNSyiFoA8F+ZIddXXB4UDMwkHuIX" +
  "EaF0Q/IkxGUILLD4LUMMsD+CEQkb4FTxrXuFAEcVDw1SF4m5NJlED7jBfKfU0NMD56vx2FVj+LFloCgYkCgJwwh2KohYcdal" +
  "Xa+0Oi8brwf+LybRmjCLtTqHxinvxBd5mDu0vVVndjU7rkqjKqGoBAAPvSVuf7VkbAH83ZujtcovmjPL6EqdBk5d9+V4JTgc" +
  "b8qHhtvPq4DZ4orcBgOzCayQTaOsPD7wX50NKoNJDRxdZNfb3Npe8oaj4K7bIDthv5jgRy8JXm+p0sQn6ELmrZBqyWBUfVIG" +
  "Q5uxolODBS63y7TpZQ9YdZLa9rBdhB3WmXx4ckqXCRVGyYvDdntY5tbkdIdEWaNCeAgvaA/BfygBrm4LYKjUXG7uAHMlFym8" +
  "h0O8GlfMZtl6+HtIWHKAHbl5iZLqfUcJY47uiqS31ufqAXp0HiPTRcSgeMsBjyOBgX6uBEiYFXGDuR9MeCYOMP7GhCXXJNce" +
  "VO/tbJY8cE+eulfdhIE8JO5MjTqBlTWbTSmSM/NZktBl1/ACvCTtrfiA10gYxQvFBwxnybMwdL+XdWq9XuKhE2CVW2Fg1zAJ" +
  "sOpSuikolu+kpjNrIGQdQvW+c8K9o7tinqUP6jubGM6NOY3eDKwycZ3zWwrdahmDpRqx1UIG6N9G4YBVIeNGgjz3StUi0mCV" +
  "u1Kler90N4Gy/My6XFxJtAFY5YAdv6VyEsa7NCojHG9dyJGwqnJfD6ES89QZYLEhFT/lM+CUKmxPOTM1oV++5H39hXsz/Ifw" +
  "KD01DzXYhvFHvMytiNTXUUDF2z00zifscFwxCcDsYCOA8S72WngiHHpMRbwWG/QVv6WnMrty+A/xqwPol0aogRJWBWCg/3Xi" +
  "fotI0dsfhgWzwtyN3nQSUg83WGDxHfhp9MC/uAKqO5UuR4TmxRuENPGucD2cWBFFqfTEn5uzBd2QOQHg3c1b5ERlrwSUQJVV" +
  "ihRYbIoyeT4N+r7UInb8jC+A81IUanBYJLH+Cnbl++qANvgHHYTvy0+VgDeQ3/JJmJShsAplTVhZ452H51Rgo/nSmn95TQ4A" +
  "BZ7VaqPvgVpPFDwsZbLGy7BcJou+A+2ZXKEoyhJnIeLCogGK7t3EO9BBPDNkhiHRl0u+81HS8xLfbQWHI/0TS/AV55/aYUfT" +
  "DIJ3fg5nRQNB86LTK2BjPrGj1sbe/z/PT8nNSFUKE8Gg5lW14hvR38bSbpdd+sAjZ4Z7haEPg7+DwqD38r1dDH5DHDM7wXQQ" +
  "5WFxZ2ctN3+/hGHr9v6+BcNmh3M8TXsEPgIfgY/AR+Aj8BF4n8CzPmmzasD7sz59u98X3tL6fU0rFCz+VcvpzNL8nfWZFjUo" +
  "7bZQKMDeg967hTcNfAu+WvCNhhlpv/9Hn4S12RZT5V1rhVxgvVIIM/8tfLeywj6kaeH9ofckcHZxYZom/K0r+y+/Nb12IbPv" +
  "1IBs3gwG00WX/wS92tebBuQLt6sL2JkWJl/wG3kxnS5M/yUQsxv8VgUOB70jo5EJ3TlvmTKRsNx028AEQBhjk2knTF8aMHvN" +
  "DvlUl/3QJb26N+1yvVmgy3Ymg3owr4V6hq3T7JkCFuxi4HTOv1XRwML50EAGVwIveQu2KZwnDriDX4oDbIEF8yn2Qz22tzPm" +
  "jZjAbM/NBYfF9bBgtboGph16155cYXrWtLNBxx3RAhQknqkzkBk9FIBlF5jeutdz3vADd3BvZ15v8YDr/C27DFZNk3vMW6b3" +
  "1gyYzBuDf6+xk0SmgozUBe51uyc3UzzOKXMLB7gry3K3K3c9Gy7gbnomfH3Rg3MqAJvdrunrDQJfojvJqDvYghW6ABak5y7u" +
  "YMo4Lo2MfSHLWOd7slZxBTzApiUTje/6pmLQ/Ts05IEn4R5+t9sTLifAvarfrfwOc+G/yFOfhLEfkwdEDjNWwp3BBg9NphJ3" +
  "gFSxx8pKbtKbdvmuQRXeFfcsEzn2Xds+6+FpI97kXxeg7wBb1mxWAFhlBt7oHWBrVpjBxkmecMkzqwAdMyst/Abs7sTpzY3H" +
  "RKUH/4f7Cg1ZGuSEs1LQZA2L2pvLAjbu3lnf0k6QRKH29Olnqr1O56Iia33njQI/SXIBXXkCh428dJcIEaqHTOQvgyqv0rJm" +
  "aZrGOTM8cQMUA2Z13pP2qJKckN5chSHA19VKhe9MbPJigfxIgQBbgOptH8seS6+voa4HVa8Xk8Q5Deu2J+E+mqQOErAsVwF+" +
  "WaJaW0EeTeZ1OkylHcWDXSPds6xAYI2ok0mn25Fw3OwDiRqNVeO7NtGoHf/nC8Z1EQBPUsfsTnuXvR4Jn6yEnQky3QlyJDxA" +
  "rbdgorBVIR63czkw/8Tf1gWGFjYlkYDz0qSzaWjaASycH1rUTr2xVN2ua47meZ3MCj9rrsc709xspIqAemwo44BrlQE7RGqr" +
  "TsDiswg3EAy6XJ7nARfAdYcxKDYs8Z0FZr947q//rglmdII+qIGTywAJW6IzcyaJDWUzB9jyJMwD4+F1Or4xaqB7TTKtDhsR" +
  "NwPDvjqbgYmH4iPGJmASpzuMaVPg3uKki/vrnVWol8bAlWCVnuLGZz0krSXz1/OHJYvGTVGle7ivwUU0cIEo0ALcshm223U9" +
  "yIa1Ag5kTblSE4B7OIqYJFl0gK8inFbzLDAjQvFGJsjeFPmdFg/cieW0CG9nKpRLrjRmQcDEi0MkS5ykBZBrFg5lzRvASpgE" +
  "EkZeNCz1UewUipCaBlAM7jbZiLg5LA3+FxatBS1Svn3S60CuaWJk6NyQsHSDHY/mNwKTmyQLC91EA9W0KQv8PzDxIKkCO68U" +
  "2OrfWre3rGuyoJYUrqBKOMGj70s8Co46iYlHdQb7mt1aUeUwHgdMHQuWVWGmAU3gZXUGYzSfeDBKAYVpMWHyZxyHsZIVHAVh" +
  "U0uSDHYrYmrpV2lNG0zPSL7WC5RwWGoZIw4TXsfwmFalqWWhQH/qs7yXWHlBgN+GMagg00jmFg+yk+4v/MUDrAVQ7cAUD9C7" +
  "dXoLmLzI0yAb9oqHwZkg4R7qSuYqETHhIKHQPJHxpW6mRYuHCyfp7zF1neO2B2ScJydebzgQw6KXzP8A1JjysCOWJ/7y0KK8" +
  "pArsDcgffXrrCh/4UG2qCcm/rzNRd7gakLVJSyOBfDAQy8M6X3le3ghqhWIDKYwqThx2kWHsqfhnWxyjVvnvXieoaNXAX9gP" +
  "TGU2OxOB6+HlYSAwm+0gQVt8Gsq0G2aW2PWECzfT8hZlagBsljCUA6o8OziN6HHZQdWdCbzEUwNbA0+5sV+wGjdzV3/4tZAa" +
  "D9xhgOFPF3RAeI6gSl9cmPj/btW/Tigzi3jCyll3MYVZ8dSs8rppOit1JzIOXdzssZ39HVRCTNjkFw7FPqZo5VDmJAPTvvAP" +
  "wcQbjXTqDJ9bpu3XYy+lWrVNq7SgsM2i79tXcGN+5v8ByVTUMp7dQQQAAAAASUVORK5CYII=";