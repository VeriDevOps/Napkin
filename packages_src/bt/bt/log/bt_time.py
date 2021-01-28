# pylint: disable=locally-disabled,   C0103,C0111,C0326
import datetime

class SAGATime(object):
    '''
     This class replaces the more advanced time classes in python
     that did not work in a predictable way.

     EXAMPLE
     d = SAGATime("20171017_114404.03")
     d.to_ms()
     42244030.0
    '''
    @classmethod
    def _pad(cls, number):
        res = str(number)
        if number < 10:
            res = "0" + res
        return res
    @classmethod
    def hour_fraction_to_ms(cls, time):
        """
        EXAMPLE:
        SAGATime.hour_fraction_to_ms(1.23934)
        >>>> 4461624
        """

        hour = int(time)
        minute = (time - hour) * 60
        second = (minute - int(minute)) * 60

        res = hour *3600000
        res += int(minute) * 60000
        res += second * 1000

        return res


    def __init__(self, yyyymmdd_hhmmss="00000000_000000"):
        '''

             EXAMPLE
         d = SAGATime("20171017_114404.03")
         d.to_ms()
         42244030.0
        '''
        assert(type(yyyymmdd_hhmmss) is str)
        self.dt = yyyymmdd_hhmmss

    def year(self):
        return int(self.dt[0:4])
    def month(self):
        return int(self.dt[4:6])
    def day(self):
        return int(self.dt[6:8])

    def hour(self):
        return int(self.dt[9:11])

    def minute(self):
        return int(self.dt[11:13])

    def second(self):
        return float(self.dt[13:])

    def get_time(self):
        '''
        Example:
        d = SAGATime("20171017_114404.03")
        [hours,minutes,seconds] = d.get_time()
        '''
        return [int(self.dt[9:11]), int(self.dt[11:13]), float(self.dt[13:])]
    def get_date(self):
        return  [int(self.dt[0:4]), int(self.dt[4:6]), int(self.dt[6:8])]


    def from_ms(self,t):
        '''
         Set the time from a ms count.
         Current date is unchanged.
        '''

        hours   = int(t / 3600000)
        t       = t %  3600000
        minutes = int(t  /  60000)
        t       = t % 60000
        seconds = float(t) / 1000
        time = SAGATime._pad(hours) + SAGATime._pad(minutes) + SAGATime._pad(seconds)
        self.dt = self.dt[:8] + "_" + time
        return self

    def to_ms(self):
        '''
        Returns milliseconds from midnight.
        Only the time part is considered.
        '''
        [hours,minutes,seconds] = self.get_time()
        res  = hours   * 3600000
        res += minutes * 60000
        res += seconds * 1000
        return res
    
    def to_py_datetime(self):
        [year, month, day] = self.get_date()
        [hour, minute, second] = self.get_time()
        sec = int(second)
        microsecond = int(1000000*(second - sec))
        return datetime.datetime(year, month, day, hour, minute, sec, microsecond)
    
    def delta(self,other):
        '''
        returns this - other in seconds (float)
        Note that DATE is considered to take care of over midnight executions. 
        '''
        a = self.to_py_datetime()
        b = other.to_py_datetime()
        d = a-b
        res = d.days * 86400
        res += d.seconds
        res += d.microseconds/1000000
        return res
    def __sub__(self,other):
        return self.delta(other)
    
    def from_hour_fraction(self,t):
        h = int(t)
        t = (t - h) * 60
        m = int(t)
        t = (t - m)*60
        s = t
        time = SAGATime._pad(h) + SAGATime._pad(int(m))  + SAGATime._pad(s)
        self.dt = self.dt[:8] + "_" + time
        return self
    def to_ISO(self):
        '''
        returns the current date time string in ISO format
        so it can be used in pd.datetime64 for example.
        '''
        res =  self.dt[0:4] + "-" + self.dt[4:6] + "-" + self.dt[6:8] + \
               "T" + self.dt[9:11] +":" + self.dt[11:13] + ":" + self.dt[13:]
        return res[:29] # Magic limit. Longer string corrupts the np.datetime64!
    def to_hour_fraction(self):
        [hours,minutes,seconds] = self.get_time()
        hf = hours + float(minutes)/60 + float(seconds) / 3600
        return hf


    def __to_str__(self):
        return self.dt
    def __repr__(self):
        return self.dt

# poor mans Unit test

def test_SAGATime():
    '''
    Unit test for this clas (using py.test)
    Note that this will be tested multiple times since
    the file is included in other files.
    '''
    d = SAGATime("20171017_114404.03")
    assert d.year() == 2017
    assert d.month() == 10
    assert d.day() == 17
    assert d.hour() == 11
    assert d.minute() == 44
    assert d.second() == 4.03
    assert d.to_ms() == 39600000 + 2640000 + 4030
    assert d.get_time() == [11, 44, 04.03]
    assert d.to_ISO() == "2017-10-17T11:44:04.03"

    assert SAGATime.hour_fraction_to_ms(1.23934) == 4461624 #against google benchmark.
    assert str(SAGATime().from_hour_fraction(1.23934)) == '00000000_011421.624' # google again
    assert (SAGATime().from_hour_fraction(t = 1.86335083333).to_hour_fraction() \
            - 1.86335083333) < 0.000000000001

    assert str(SAGATime().from_ms(4461624)) == '00000000_011421.624' # google again

    assert str(SAGATime('20170101_00000').from_ms(SAGATime('20170101_015148.62999').to_ms())) \
           == '20170101_015148.62999'
