from fetch_crypto import get_crypto_price

def test_get_crypto_price():
    # Test fetching the price of Bitcoin in USD
    crypto = "bitcoin"
    vs_currency = "usd"
    result = get_crypto_price(crypto, vs_currency)
    
    # Check if the result contains the expected data
    assert crypto in result, f"Expected {crypto} in result"
    assert vs_currency in result[crypto], f"Expected {vs_currency} in result[{crypto}]"
    assert isinstance(result[crypto][vs_currency], (int, float)), f"Expected a number for {crypto} price in {vs_currency}"

    print(f"Price of {crypto} in {vs_currency}: {result[crypto][vs_currency]}")

if __name__ == "__main__":
    test_get_crypto_price()