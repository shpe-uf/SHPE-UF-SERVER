from selenium.webdriver.support.ui import Select
from selenium import webdriver
from bs4 import BeautifulSoup
import requests
import json
import time

driver = webdriver.Chrome(executable_path=r'C:/Users/hp/Documents/chromedriver_win32/chromedriver.exe')
url = "https://one.ufl.edu/soc/"

driver.get(url)
time.sleep(10)
html = driver.page_source
time.sleep(5)
selectSemester = Select(driver.find_element_by_id('semes')).select_by_visible_text('Fall 2020')
time.sleep(5)
selectProgram = Select(driver.find_element_by_id('prog')).select_by_visible_text('Campus / Web / Special Program')
time.sleep(5)
searchButton = driver.find_element_by_xpath('//*[@id="filterSidebar"]/button')
searchButton.click()
#at this point, the page shows the first 50 courses
print (html)
