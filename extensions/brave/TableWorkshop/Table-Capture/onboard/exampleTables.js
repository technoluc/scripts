function exRenderLinksTable(wrapper) {
  wrapper.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Username</th>
          <th>Email Address (mailto)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Russell <span style="display:none;">(Invisible Russ Cell Text)</span></td>
          <td>Westbrook</td>
          <td><a href="https://www.instagram.com/russwest44/">@russwest44</a></td>
          <td><a href="mailto:russ@westbrook.com">Contact</a></td>
        </tr>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Steph</td>
          <td>Curry</td>
          <td><a href="https://www.instagram.com/stephencurry30/">@stephencurry30</a></td>
          <td><a href="mailto:steph@curry.com">Contact</a></td>
        </tr>
        <tr>
          <td><input type="checkbox"></td>
          <td>LeBron</td>
          <td>James</td>
          <td><a href="https://www.instagram.com/kingjames/">@kingjames</a></td>
          <td><a href="mailto:witness@lebron.com">Contact</a></td>
        </tr>
        <tr></tr>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Kawhi</td>
          <td>Leonard</td>
          <td><a href="https://en.wikipedia.org/wiki/Kawhi_Leonard">Wikipedia</a></td>
          <td><a href="mailto:the@klaw.com">Contact</a></td>
        </tr>
        <tr>
          <td><input type="checkbox"></td>
          <td colspan="2">Pelé</td>
          <td><a href="https://en.wikipedia.org/wiki/Pel%C3%A9">Wikipedia</a></td>
          <td><a href="mailto:foot@ball.org">Contact</a></td>
        </tr>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Paweł</td>
          <td>Pawlikowski</td>
          <td><a href="https://en.wikipedia.org/wiki/Pawe%C5%82_Pawlikowski">Wikipedia</a></td>
          <td><a href="mailto:good@movies.com">Contact</a></td>
        </tr>
      </tbody>
    </table>
  `;
}

function exRenderDynamicRealtimeTable(wrapper) {
  const id = `t-${Math.floor(Math.random() * 1000)}`;
  wrapper.innerHTML = `
    <table class="table" id="${id}">
      <thead>
        <tr>
          <th>Company</th>
          <th>Ticker</th>
          <th>Random Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Alphabet</td>
          <td>NASDAQ:GOOG</td>
          <td class="placeholder-data-random"></td>
        </tr>
        <tr>
          <td>Meta</td>
          <td>NASDAQ:FB</td>
          <td class="placeholder-data-random"></td>
        </tr>
        <tr>
          <td>Peloton</td>
          <td>NASDAQ:PTON</td>
          <td class="placeholder-data-random"></td>
        </tr>
      </tbody>
    </table>
  `;
  setInterval(() => {
    Array.from(
      document.querySelectorAll(`#${id} .placeholder-data-random`)
    ).forEach((cell) => {
      cell.innerHTML = Math.floor((Math.random() * 100000) / 100);
    });
  }, 1000);
}

function exRenderBasicBTable(wrapper) {
  wrapper.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Country</th>
          <th>ELO Rating</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Magnus Carlsen</td>
          <td>Norway</td>
          <td>2872</td>
        </tr>
        <tr>
          <td>Alireza Firouzja</td>
          <td>Iran</td>
          <td>2801</td>
        </tr>
        <tr>
          <td>Maxime Vachier-Lagrave</td>
          <td>France</td>
          <td>2797</td>
        </tr>
        <tr>
          <td>George Mike</td>
          <td>USA</td>
          <td>1900</td>
        </tr>
      </tbody>
    </table>
  `;
}

function exRenderBasicTable(wrapper) {
  wrapper.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Username</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Russell <span style="display:none;">(Invisible Russ Cell Text)</span></td>
          <td>Westbrook</td>
          <td><a href="https://www.instagram.com/russwest44/">@russwest44</a></td>
        </tr>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Steph</td>
          <td>Curry</td>
          <td><a href="https://www.instagram.com/stephencurry30/">@stephencurry30</a></td>
        </tr>
        <tr>
          <td><input type="checkbox"></td>
          <td>LeBron</td>
          <td>James</td>
          <td><a href="https://www.instagram.com/kingjames/">@kingjames</a></td>
        </tr>
        <tr></tr>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Kawhi</td>
          <td>Leonard</td>
          <td><a href="https://en.wikipedia.org/wiki/Kawhi_Leonard">Wikipedia</a></td>
        </tr>
        <tr>
          <td><input type="checkbox"></td>
          <td colspan="2">Pelé</td>
          <td><a href="https://en.wikipedia.org/wiki/Pel%C3%A9">Wikipedia</a></td>
        </tr>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Paweł</td>
          <td>Pawlikowski</td>
          <td><a href="https://en.wikipedia.org/wiki/Pawe%C5%82_Pawlikowski">Wikipedia</a></td>
        </tr>
      </tbody>
    </table>
  `;
}

function exRenderNumbersTable(wrapper) {
  wrapper.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>Country</th>
          <th>Population</th>
          <th>Money Number</th>
          <th>Money Number (No Space Between)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>China</td>
          <td>1,439,323,776</td>
          <td>¥ 1,234.56</td>
          <td>¥34.56</td>
        </tr>
        <tr>
          <td>2</td>
          <td>India</td>
          <td>1,380,004,385	</td>
          <td>₹ 1,26,968</td>
          <td>₹1,26,968</td>
        </tr>
        <tr>
          <td>3</td>
          <td>United States</td>
          <td>331,002,651</td>
          <td>$34,248.45</td>
          <td>$3,500</td>
        </tr>
        <tr></tr>
        <tr>
          <td>13</td>
          <td>Philippines</td>
          <td>111,881,632	</td>
          <td>₱ 1,234.56</td>
          <td>₱499.99</td>
        </tr>
        <tr>
          <td>18</td>
          <td>Turkey</td>
          <td>84,680,273</td>
          <td>1,234.56 ₺</td>
          <td>1,234.56₺</td>
        </tr>
      </tbody>
    </table>
  `;
}

function exRenderStaticMixedTable(wrapper) {
  wrapper.innerHTML = `
    <table class="table">
      <thead>
        <tr>
          <th>#</th>
          <th>First Name</th>
          <th>Last Name</th>
          <th>Username</th>
          <th>Birthplace</th>
          <th>Salary <span style="display:none;">(Invisible Column Text Hidden By CSS)</span></th>
          <th>Icon</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Russell <span style="display:none;">(Invisible Russ Cell Text)</span></td>
          <td>Westbrook</td>
          <td><a href="https://www.instagram.com/russwest44/">@russwest44</a></td>
          <td>Long Beach, California</td>
          <td>$85.70 </td>
          <td><img alt="Presentious logo" src="https://www.georgemike.com/images/port.presentious.icon.png"></td>
        </tr>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Steph</td>
          <td>Curry</td>
          <td><a href="https://www.instagram.com/stephencurry30/">@stephencurry30</a></td>
          <td rowspan="2">Akron, Ohio</td>
          <td>-$550.50</td>
          <td><img alt="Prompt logo" src="https://www.georgemike.com/images/port.prompt.icon.png"></td>
        </tr>
        <tr>
          <td><input type="checkbox"></td>
          <td>LeBron</td>
          <td>James</td>
          <td><a href="https://www.instagram.com/kingjames/">@kingjames</a></td>
          <td>AUD 76.09</td>
          <td><img alt="Goalboard logo" src="https://www.georgemike.com/images/port.goalboard.icon.png"></td>
        </tr>
        <tr></tr>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Kawhi</td>
          <td>Leonard</td>
          <td><a href="https://en.wikipedia.org/wiki/Kawhi_Leonard">Wikipedia</a></td>
          <td>Los Angeles, California</td>
          <td>-3,000,000¥</td>
          <td><img alt="BoomChing logo" src="https://www.georgemike.com/images/port.boomching.icon.png"></td>
        </tr>
        <tr></tr>
        <tr></tr>
        <tr>
          <td><input type="checkbox"></td>
          <td colspan="2">Pelé</td>
          <td><a href="https://en.wikipedia.org/wiki/Pel%C3%A9">Wikipedia</a></td>
          <td>Minas Gerais, Brazil</td>
          <td>R$21.00</td>
          <td><img alt="Table Capture logo" src="https://www.georgemike.com/images/port.tablecapture.icon.png"></td>
        </tr>
        <tr>
          <td><input type="checkbox" checked=""></td>
          <td>Paweł</td>
          <td>Pawlikowski</td>
          <td><a href="https://en.wikipedia.org/wiki/Pawe%C5%82_Pawlikowski">Wikipedia</a></td>
          <td>Warsaw, Poland</td>
          <td>0,0193</td>
          <td><img alt="React logo" src="https://www.georgemike.com/images/port.serv.react.png"></td>
        </tr>
      </tbody>
    </table>
  `;
}
